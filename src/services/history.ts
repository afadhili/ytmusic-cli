import { desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { history, tracks } from "../db/schema.js";
import type { Track } from "../db/schema.js";

export type HistoryTrack = {
    id: number;
    playedAt: string;
    track: Track;
};

export async function getHistory(
    limit = 50,
    query = "",
): Promise<HistoryTrack[]> {
    const search = query.trim();

    const condition = search
        ? or(
            like(tracks.name, `%${search}%`),
            like(tracks.artist, `%${search}%`),
        )
        : undefined;

    const rows = condition
        ? await db
            .select({
                id: history.id,
                playedAt: history.playedAt,

                type: tracks.type,
                videoId: tracks.videoId,
                name: tracks.name,
                artist: tracks.artist,
                duration: tracks.duration,
                thumbnails: tracks.thumbnails,
            })
            .from(history)
            .innerJoin(tracks, eq(history.videoId, tracks.videoId))
            .where(condition)
            .orderBy(desc(history.playedAt))
            .limit(limit)
        : await db
            .select({
                id: history.id,
                playedAt: history.playedAt,

                type: tracks.type,
                videoId: tracks.videoId,
                name: tracks.name,
                artist: tracks.artist,
                duration: tracks.duration,
                thumbnails: tracks.thumbnails,
            })
            .from(history)
            .innerJoin(tracks, eq(history.videoId, tracks.videoId))
            .orderBy(desc(history.playedAt))
            .limit(limit);

    return rows.map((row) => ({
        id: row.id,
        playedAt: row.playedAt,
        track: {
            type: row.type,
            videoId: row.videoId,
            name: row.name,
            artist: row.artist,
            duration: row.duration,
            thumbnails: row.thumbnails,

        },
    }));
}

export async function addHistory(track: Track): Promise<void> {
    const existingTrack = await db.query.tracks.findFirst({
        where: eq(tracks.videoId, track.videoId),
    });

    if (!existingTrack) {
        await db.insert(tracks).values(track);
    }

    const historyExist = await db.query.history.findFirst({
        where: eq(history.videoId, track.videoId),
    });

    if (historyExist) {
        await db
            .update(history)
            .set({
                playedAt: new Date().toISOString(),
            })
            .where(eq(history.id, historyExist.id));
    } else {
        await db.insert(history).values({
            videoId: track.videoId,
            playedAt: new Date().toISOString()
        });
    }
}