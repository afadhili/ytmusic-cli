import { eq } from "drizzle-orm";
import db from "../db/index.js";
import { lyrics, tracks, type Lyrics, type Track } from "../db/schema.js";
import { getLyricsYt } from "./yt-music.js";

export type LrcLibLyrics = {
    id: number;
    name: string;
    trackName: string;
    artistName: string;
    albumName: string;
    duration: number;
    instrumental: boolean;
    plainLyrics: string | null;
    syncedLyrics: string | null;
};

async function fetchLyricsFromLrcLib(track: Track): Promise<LrcLibLyrics | null> {
    const url = new URL("https://lrclib.net/api/get");

    url.searchParams.set("artist_name", track.artist);
    url.searchParams.set("track_name", track.name);

    try {
        const res = await fetch(url);

        if (res.status === 404) {
            return null;
        }

        if (!res.ok) {
            throw new Error(`LRCLIB error: ${res.status}`);
        }

        return (await res.json()) as LrcLibLyrics;
    } catch (err) {
        console.error("Failed to fetch lyrics:", err);
        return null;
    }
}

export async function getCachedLyrics(videoId: string): Promise<Lyrics | null> {
    const result = await db.query.lyrics.findFirst({
        where: eq(lyrics.videoId, videoId),
    });

    return result ?? null;
}

export async function saveLyricsToCache(
    track: Track,
    data: LrcLibLyrics,
): Promise<void> {
    await db
        .insert(tracks)
        .values(track)
        .onConflictDoUpdate({
            target: tracks.videoId,
            set: {
                name: track.name,
                artist: track.artist,
                duration: track.duration,
                thumbnails: track.thumbnails,
            },
        });

    await db
        .insert(lyrics)
        .values({
            videoId: track.videoId,

            lrcLibId: data.id,

            trackName: data.trackName,
            artistName: data.artistName,
            albumName: data.albumName,

            duration: Math.round(data.duration),
            instrumental: data.instrumental,

            plainLyrics: data.plainLyrics,
            syncedLyrics: data.syncedLyrics,

            updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
            target: lyrics.videoId,
            set: {
                lrcLibId: data.id,

                trackName: data.trackName,
                artistName: data.artistName,
                albumName: data.albumName,

                duration: Math.round(data.duration),
                instrumental: data.instrumental,

                plainLyrics: data.plainLyrics,
                syncedLyrics: data.syncedLyrics,

                updatedAt: new Date().toISOString(),
            },
        });
}

export async function getLyrics(track: Track): Promise<Lyrics | null> {
    const cached = await getCachedLyrics(track.videoId);

    if (cached) {
        return cached;
    }

    const fetched = await fetchLyricsFromLrcLib(track);

    if (!fetched) {
        const plain_lyrics = getLyricsYt(track.videoId)
        const lyrics: LrcLibLyrics | null = !plain_lyrics ? null : {
            albumName: "",
            artistName: track.artist,
            duration: track.duration || 0,
            instrumental: false,
            plainLyrics: (await plain_lyrics).join("\n"),
            syncedLyrics: "",
            trackName: track.name,
            id: 0,
            name: track.name
        };
        if (!lyrics) return null;
        await saveLyricsToCache(track, lyrics);
        return await getCachedLyrics(track.videoId)
    }

    await saveLyricsToCache(track, fetched);

    return await getCachedLyrics(track.videoId);
}

export async function refreshLyrics(track: Track): Promise<Lyrics | null> {
    const fetched = await fetchLyricsFromLrcLib(track);

    if (!fetched) {
        return null;
    }

    await saveLyricsToCache(track, fetched);

    return await getCachedLyrics(track.videoId);
}