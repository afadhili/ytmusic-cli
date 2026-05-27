import YTMusic from "ytmusic-api";
import { CONFIG_PATH, expandPath, loadConfig } from "../lib/config.js";
import { SongDetails, Track, UpNextRuntime } from "../types/yt-music.types.js";
import { getThumbnail } from "../lib/get-thumbnail.js";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import useAppStore from "../app.store.js";
import { mpvCommand, waitForSocket } from "./mpv.js";
import { addHistory } from "./history.js";
import { debugLog } from "../lib/debug-log.js";

const config = loadConfig();
const CACHE_DIR = expandPath(config.cacheDir) ?? expandPath("~/Music");

const AUDIO_FORMATS: Array<"opus" | "mp3" | "m4a" | "flac"> = ["opus", "mp3", "m4a", "flac"];

export function getAudioFormatFallbackChain(): Array<"opus" | "mp3" | "m4a" | "flac"> {
    const config = loadConfig();
    const primaryFormat = config.audioFormat;
    const customFallbacks = (config.audioFormatFallback ?? []) as Array<"opus" | "mp3" | "m4a" | "flac">;

    const chain: Array<"opus" | "mp3" | "m4a" | "flac"> = [primaryFormat];

    for (const format of customFallbacks) {
        if (!chain.includes(format)) {
            chain.push(format);
        }
    }

    for (const format of AUDIO_FORMATS) {
        if (!chain.includes(format)) {
            chain.push(format);
        }
    }

    return chain;
}

function getMusicPathWithFormat(track: Track, format: string): string {
    return join(CACHE_DIR, `${track.videoId}.${format}`);
}
export function getCookie(): string | undefined {
    const config = loadConfig();

    if (!config.customCookiesPath) {
        return undefined;
    }

    const cookiePath = expandPath(config.customCookiesPath);

    if (!existsSync(cookiePath)) {
        throw new Error(
            `Cookie file not found: ${cookiePath}\nPlease edit your config file manually: ${CONFIG_PATH}`
        );
    }

    const cookie = readFileSync(cookiePath, "utf-8").trim();

    if (!cookie) {
        throw new Error(
            `Cookie file is empty: ${cookiePath}\nPlease edit your config file manually: ${CONFIG_PATH}`
        );
    }

    return cookie;
}

const cookie = getCookie()

const ytmusic = new YTMusic();
await ytmusic.initialize({
    cookies: cookie
});

const downloading = new Set<string>();

export function parseDurationStringToNumber(duration: string | number | null): number | null {
    if (duration == null) return null;

    if (typeof duration === "number") {
        return duration;
    }

    const parts = duration.split(":").map(Number);

    if (parts.some(Number.isNaN)) {
        return null;
    }

    if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return minutes * 60 + seconds;
    }

    if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return hours * 3600 + minutes * 60 + seconds;
    }

    return null;
}

export function parseDurationNumberToString(seconds: number | string | null): string {
    if (typeof seconds === "string") return seconds;
    if (seconds == null) return "--:--";

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function toTrack(song: SongDetails | UpNextRuntime): Track {
    function isUpNextRuntime(
        song: SongDetails | UpNextRuntime,
    ): song is UpNextRuntime {
        return "title" in song && "thumbnail" in song;
    }

    if (isUpNextRuntime(song)) {
        return {
            type: "SONG",
            name: song.title,
            videoId: song.videoId,
            artist: song.artists,
            duration: parseDurationStringToNumber(song.duration),
            thumbnails: song.thumbnail,
        };
    }

    return {
        type: "SONG",
        name: song.name,
        videoId: song.videoId,
        artist: song.artist.name,
        duration: song.duration,
        thumbnails: getThumbnail(song.thumbnails),
    };
}

export const searchTracks = async (query: string): Promise<Track[] | null> => {
    try {
        const tracks = await ytmusic.searchSongs(query);
        return tracks.map((track) => toTrack(track as SongDetails));
    } catch (err) {
        console.error(err);
        return null;
    }
};

export const getNextTracks = async (songId: string): Promise<Track[] | null> => {
    try {
        const tracks = await ytmusic.getUpNexts(songId);
        return tracks.map((track) => toTrack(track as unknown as UpNextRuntime));
    } catch (err) {
        console.error(err);
        return null;
    }
};

export const getLyricsYt = async (songId: string): Promise<string[]> => {
    try {
        const lyric = await ytmusic.getLyrics(songId);
        if (!lyric || lyric.length == 0) return [];
        return lyric;
    } catch (err) {
        console.error(err)
        return [];
    }
}

export function getTrackUrl(track: Track): string {
    return `https://music.youtube.com/watch?v=${track.videoId}`;
}

export function getMusicPath(track: Track): string {
    const config = loadConfig();
    return getMusicPathWithFormat(track, config.audioFormat);
}

function getCachedMusicPath(track: Track): string | null {
    for (const format of AUDIO_FORMATS) {
        const path = getMusicPathWithFormat(track, format);
        if (fileExists(path)) {
            return path;
        }
    }
    return null;
}

function fileExists(filePath: string): boolean {
    return existsSync(filePath) && statSync(filePath).size > 0;
}

function downloadMusic(track: Track): void {
    const config = loadConfig();
    const formatChain = getAudioFormatFallbackChain();

    mkdirSync(CACHE_DIR, { recursive: true });

    const attemptDownload = (formatIndex: number) => {
        if (formatIndex >= formatChain.length) {
            debugLog(`Download exhausted all formats for: ${track.name}`);
            return;
        }

        const format = formatChain[formatIndex];
        const localPath = getMusicPathWithFormat(track, format);

        if (downloading.has(track.videoId)) return;
        if (fileExists(localPath)) {
            debugLog(`Audio already cached in ${format} format: ${track.name}`);
            return;
        }

        downloading.add(track.videoId);
        debugLog(`Attempting download in ${format} format: ${track.name}`);

        const ytDlp = spawn(
            config.ytdlpBinary ?? "yt-dlp",
            [
                "--no-playlist",
                "-f",
                "bestaudio",
                "-x",
                "--audio-format",
                format,
                "--audio-quality",
                "0",
                "--embed-metadata",
                "-o",
                join(CACHE_DIR, "%(id)s.%(ext)s"),
                getTrackUrl(track),
            ],
            {
                detached: false,
                stdio: ["ignore", "pipe", "pipe"],
            },
        );

        let stderrOutput = "";

        if (ytDlp.stderr) {
            ytDlp.stderr.on("data", (data) => {
                stderrOutput += data.toString();
            });
        }

        ytDlp.on("close", (code) => {
            downloading.delete(track.videoId);

            if (code !== 0) {
                const errorMsg = stderrOutput.split("\n").find(line => line.includes("ERROR")) || `code: ${code}`;
                debugLog(`Download failed in ${format} format: ${track.name} - ${errorMsg}`);

                attemptDownload(formatIndex + 1);
                return;
            }

            if (!fileExists(localPath)) {
                debugLog(`Downloaded file not found in ${format} format: ${localPath}`);
                attemptDownload(formatIndex + 1);
                return;
            }

            debugLog(`Downloaded successfully in ${format} format: ${track.name}`);
        });

        ytDlp.on("error", (err) => {
            downloading.delete(track.videoId);
            debugLog(`yt-dlp error in ${format} format for: ${track.name} - ${err}`);
            attemptDownload(formatIndex + 1);
        });
    };

    attemptDownload(0);
}

export async function playMusic(track: Track) {
    try {
        mkdirSync(CACHE_DIR, { recursive: true });
    } catch (err) {
        debugLog(`Failed to create cache directory: ${err}`);
    }

    const { tracksType } = useAppStore.getState();

    try {
        await waitForSocket();
    } catch (err) {
        debugLog(`Socket error: ${err}`);
        throw err;
    }

    addHistory(track);

    const cachedPath = getCachedMusicPath(track);

    if (tracksType === "auto") {
        appendQueueIfNeeded();
    }

    if (cachedPath) {
        try {
            debugLog(`Playing cached file: ${cachedPath}`);
            await mpvCommand(["loadfile", cachedPath, "replace"]);
            return;
        } catch (err) {
            debugLog(`Failed to play cached file: ${err}`);
        }
    }

    if (loadConfig().downloadOnPlay) {
        downloadMusic(track);
    }

    try {
        debugLog(`Streaming track: ${track.name}`);
        await mpvCommand(["loadfile", getTrackUrl(track), "replace"]);
    } catch (err) {
        debugLog(`Failed to load track: ${err}`);
        throw err;
    }
}

export async function playNext() {
    const { tracks, currentIndex, playNextTrack } = useAppStore.getState();

    const nextTrack = tracks[currentIndex + 1];

    if (!nextTrack) {
        debugLog("No next track available");
        return;
    }

    playNextTrack();

    try {
        await playMusic(nextTrack);
    } catch (err) {
        debugLog(`Failed to play next track: ${err}`);
    }
}

export async function playPrev() {
    const { tracks, currentIndex, playPrevTrack } = useAppStore.getState();

    const prevTrack = tracks[currentIndex - 1];

    if (!prevTrack) {
        debugLog("No previous track available");
        return;
    }

    playPrevTrack();

    try {
        await playMusic(prevTrack);
    } catch (err) {
        debugLog(`Failed to play previous track: ${err}`);
    }
}

let appendingQueue = false;

export async function appendQueueIfNeeded() {
    if (appendingQueue) return;

    const { tracks, currentIndex, setTracks } = useAppStore.getState();

    if (currentIndex < 0) return;

    const remainingNextCount = tracks.length - currentIndex - 1;

    if (remainingNextCount > 2) return;

    const lastTrack = tracks[tracks.length - 1];

    if (!lastTrack) return;

    appendingQueue = true;

    try {
        const nexts = await getNextTracks(lastTrack.videoId);

        if (!nexts || nexts.length === 0) {
            debugLog("No next tracks found from API");
            return;
        }

        const existingIds = new Set(tracks.map((track) => track.videoId));

        const filteredNexts = nexts.filter((track) => {
            return !existingIds.has(track.videoId);
        });

        if (filteredNexts.length === 0) {
            debugLog("All next tracks already in queue");
            return;
        }

        setTracks([...tracks, ...filteredNexts], currentIndex);
        debugLog(`Appended ${filteredNexts.length} tracks to queue`);
    } catch (err) {
        debugLog(`Failed to append queue: ${err}`);
    } finally {
        appendingQueue = false;
    }
}