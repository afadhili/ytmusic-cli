import { desc, eq, like, or } from "drizzle-orm";
import db from "../db/index.js";
import { favorites, tracks, type Track } from "../db/schema.js";

export type FavoriteTrack = {
    addedAt: string;
    track: Track;
};

export async function getFavorites(query = ""): Promise<FavoriteTrack[]> {
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
                addedAt: favorites.addedAt,

                type: tracks.type,
                videoId: tracks.videoId,
                name: tracks.name,
                artist: tracks.artist,
                duration: tracks.duration,
                thumbnails: tracks.thumbnails,
            })
            .from(favorites)
            .innerJoin(tracks, eq(favorites.videoId, tracks.videoId))
            .where(condition)
            .orderBy(desc(favorites.addedAt))
        : await db
            .select({
                addedAt: favorites.addedAt,

                type: tracks.type,
                videoId: tracks.videoId,
                name: tracks.name,
                artist: tracks.artist,
                duration: tracks.duration,
                thumbnails: tracks.thumbnails,
            })
            .from(favorites)
            .innerJoin(tracks, eq(favorites.videoId, tracks.videoId))
            .orderBy(desc(favorites.addedAt));

    return rows.map((row) => ({
        addedAt: row.addedAt,
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

export async function checkIsFavorite(track: Track): Promise<boolean> {
    const result = await db.query.favorites.findFirst({
        where: eq(favorites.videoId, track.videoId),
    });

    return Boolean(result);
}

export async function toggleFavorite(
    track: Track,
    currentValue: boolean,
): Promise<boolean> {
    if (currentValue) {
        await db.delete(favorites).where(eq(favorites.videoId, track.videoId));
        return false;
    }

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
        .insert(favorites)
        .values({
            videoId: track.videoId,
        })
        .onConflictDoNothing();

    return true;
}

export async function removeFavorite(videoId: string): Promise<void> {
    await db.delete(favorites).where(eq(favorites.videoId, videoId));
}

export async function addFavorite(track: Track): Promise<void> {
    await db
        .insert(tracks)
        .values(track)
        .onConflictDoNothing();

    await db
        .insert(favorites)
        .values({
            videoId: track.videoId,
        })
        .onConflictDoNothing();
}

export async function isFavorite(videoId: string): Promise<boolean> {
    const result = await db.query.favorites.findFirst({
        where: eq(favorites.videoId, videoId),
    });

    return Boolean(result);
}