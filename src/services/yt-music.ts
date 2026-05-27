import YTMusic from "ytmusic-api";
import { CONFIG_DIR, CONFIG_PATH, expandPath, loadConfig } from "../lib/config.js";
import { SongDetails, Track, UpNextRuntime } from "../types/yt-music.types.js";
import { getThumbnail } from "../lib/get-thumbnail.js";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import path, { join } from "node:path";
import useAppStore from "../app.store.js";
import { mpvCommand, waitForSocket } from "./mpv.js";
import { addHistory } from "./history.js";
import { debugLog } from "../lib/debug-log.js";

const config = loadConfig();
const CACHE_DIR = expandPath(config.cacheDir) ?? expandPath("~/Music");
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
    return join(CACHE_DIR, `${track.videoId}.${config.audioFormat}`)
}

function fileExists(filePath: string): boolean {
    return existsSync(filePath) && statSync(filePath).size > 0;
}

function downloadMusic(track: Track): void {
    const config = loadConfig();

    mkdirSync(config.cacheDir, { recursive: true });

    const localPath = getMusicPath(track);

    if (fileExists(localPath)) return;
    if (downloading.has(track.videoId)) return;

    downloading.add(track.videoId);

    const ytDlp = spawn(
        config.ytdlpBinary ?? "yt-dlp",
        [
            "--no-playlist",
            "-f",
            "bestaudio",
            "-x",
            "--audio-format",
            config.audioFormat,
            "--audio-quality",
            "0",
            "--embed-metadata",
            "-o",
            join(config.cacheDir, "%(id)s.%(ext)s"),
            getTrackUrl(track),
        ],
        {
            detached: false,
            stdio: "ignore",
        },
    );

    ytDlp.on("close", (code) => {
        downloading.delete(track.videoId);

        if (code !== 0) {
            debugLog(`Download failed: ${track.name}, code: ${code}`);
            return;
        }

        if (!fileExists(localPath)) {
            debugLog(`Downloaded file not found: ${localPath}`);
            return;
        }

        // console.log(`Downloaded: ${track.name}`);
    });

    ytDlp.on("error", (err) => {
        downloading.delete(track.videoId);
        debugLog(`yt-dlp error: ${track.name}`, err);
    });
}

export async function playMusic(track: Track) {
    mkdirSync(CACHE_DIR, { recursive: true });
    const { tracksType } = useAppStore.getState();

    await waitForSocket();
    addHistory(track);

    const localPath = getMusicPath(track);

    if (tracksType === "auto") {
        appendQueueIfNeeded();
    }

    if (existsSync(localPath)) {
        await mpvCommand(["loadfile", localPath, "replace"]);
        return;
    }

    if (loadConfig().downloadOnPlay) {
        downloadMusic(track);
    }

    await mpvCommand(["loadfile", getTrackUrl(track), "replace"]);
}

export async function playNext() {
    const { tracks, currentIndex, playNextTrack } = useAppStore.getState();

    const nextTrack = tracks[currentIndex + 1];

    if (!nextTrack) return;

    playNextTrack();

    await playMusic(nextTrack);
}

export async function playPrev() {
    const { tracks, currentIndex, playPrevTrack } = useAppStore.getState();

    const prevTrack = tracks[currentIndex - 1];

    if (!prevTrack) return;

    playPrevTrack();

    await playMusic(prevTrack);
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

        if (!nexts || nexts.length === 0) return;

        const existingIds = new Set(tracks.map((track) => track.videoId));

        const filteredNexts = nexts.filter((track) => {
            return !existingIds.has(track.videoId);
        });

        if (filteredNexts.length === 0) return;

        setTracks([...tracks, ...filteredNexts], currentIndex);
    } catch (err) {
        console.error("Failed to append queue:", err);
    } finally {
        appendingQueue = false;
    }
}