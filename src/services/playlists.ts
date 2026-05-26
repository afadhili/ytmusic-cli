import { and, asc, eq, max } from "drizzle-orm";
import { db } from "../db/index.js";
import {
    playlists,
    playlistItems,
    tracks,
    type Playlist,
    type Track,
} from "../db/schema.js";

export type PlaylistWithCount = Playlist & {
    totalTracks: number;
};

export type PlaylistTrack = Track & {
    playlistItemId: number;
    position: number;
    addedAt: string;
};

export async function getPlaylists(): Promise<PlaylistWithCount[]> {
    const rows = await db
        .select({
            id: playlists.id,
            name: playlists.name,
            createdAt: playlists.createdAt,
            updatedAt: playlists.updatedAt,
        })
        .from(playlists)
        .orderBy(asc(playlists.name));

    const result: PlaylistWithCount[] = [];

    for (const playlist of rows) {
        const items = await db
            .select()
            .from(playlistItems)
            .where(eq(playlistItems.playlistId, playlist.id));

        result.push({
            ...playlist,
            totalTracks: items.length,
        });
    }

    return result;
}

export async function createPlaylist(name: string): Promise<void> {
    const trimmedName = name.trim();

    if (!trimmedName) return;

    await db
        .insert(playlists)
        .values({
            name: trimmedName,
        })
        .onConflictDoNothing();
}

export async function deletePlaylist(playlistId: number): Promise<void> {
    await db.delete(playlists).where(eq(playlists.id, playlistId));
}

export async function getPlaylistTracks(
    playlistId: number,
): Promise<PlaylistTrack[]> {
    const rows = await db
        .select({
            playlistItemId: playlistItems.id,
            position: playlistItems.position,
            addedAt: playlistItems.addedAt,
            type: tracks.type,
            videoId: tracks.videoId,
            name: tracks.name,
            artist: tracks.artist,
            duration: tracks.duration,
            thumbnails: tracks.thumbnails,
        })
        .from(playlistItems)
        .innerJoin(tracks, eq(playlistItems.videoId, tracks.videoId))
        .where(eq(playlistItems.playlistId, playlistId))
        .orderBy(asc(playlistItems.position));

    return rows.map((row) => ({
        playlistItemId: row.playlistItemId,
        position: row.position,
        addedAt: row.addedAt,

        type: row.type,
        videoId: row.videoId,
        name: row.name,
        artist: row.artist,
        duration: row.duration,
        thumbnails: row.thumbnails,
    }));
}

export async function addTrackToPlaylist(
    playlistId: number,
    track: Track,
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

    const [positionRow] = await db
        .select({
            maxPosition: max(playlistItems.position),
        })
        .from(playlistItems)
        .where(eq(playlistItems.playlistId, playlistId));

    const nextPosition = (positionRow?.maxPosition ?? -1) + 1;

    await db
        .insert(playlistItems)
        .values({
            playlistId,
            videoId: track.videoId,
            position: nextPosition,
        })
        .onConflictDoNothing();
}

export async function removeTrackFromPlaylist(
    playlistItemId: number,
): Promise<void> {
    await db
        .delete(playlistItems)
        .where(eq(playlistItems.id, playlistItemId));
}

export async function moveTrackUp(
    playlistId: number,
    playlistItemId: number,
): Promise<void> {
    const [currentItem] = await db
        .select()
        .from(playlistItems)
        .where(
            and(
                eq(playlistItems.id, playlistItemId),
                eq(playlistItems.playlistId, playlistId),
            ),
        )
        .limit(1);

    if (!currentItem) return;
    if (currentItem.position <= 0) return;

    const [previousItem] = await db
        .select()
        .from(playlistItems)
        .where(
            and(
                eq(playlistItems.playlistId, playlistId),
                eq(playlistItems.position, currentItem.position - 1),
            ),
        )
        .limit(1);

    if (!previousItem) return;

    swapPlaylistItemPositions({
        firstId: currentItem.id,
        firstPosition: currentItem.position,
        secondId: previousItem.id,
        secondPosition: previousItem.position,
    });
}

export async function moveTrackDown(
    playlistId: number,
    playlistItemId: number,
): Promise<void> {
    const [currentItem] = await db
        .select()
        .from(playlistItems)
        .where(
            and(
                eq(playlistItems.id, playlistItemId),
                eq(playlistItems.playlistId, playlistId),
            ),
        )
        .limit(1);

    if (!currentItem) return;

    const [nextItem] = await db
        .select()
        .from(playlistItems)
        .where(
            and(
                eq(playlistItems.playlistId, playlistId),
                eq(playlistItems.position, currentItem.position + 1),
            ),
        )
        .limit(1);

    if (!nextItem) return;

    swapPlaylistItemPositions({
        firstId: currentItem.id,
        firstPosition: currentItem.position,
        secondId: nextItem.id,
        secondPosition: nextItem.position,
    });
}

function swapPlaylistItemPositions({
    firstId,
    firstPosition,
    secondId,
    secondPosition,
}: {
    firstId: number;
    firstPosition: number;
    secondId: number;
    secondPosition: number;
}): void {
    const tempPosition = -999999;

    db.transaction((tx) => {
        tx.update(playlistItems)
            .set({ position: tempPosition })
            .where(eq(playlistItems.id, firstId))
            .run();

        tx.update(playlistItems)
            .set({ position: firstPosition })
            .where(eq(playlistItems.id, secondId))
            .run();

        tx.update(playlistItems)
            .set({ position: secondPosition })
            .where(eq(playlistItems.id, firstId))
            .run();
    });
}