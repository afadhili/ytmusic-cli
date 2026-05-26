import { relations, sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

export const tracks = sqliteTable(
  "tracks",
  {
    type: text("type", {
      enum: ["SONG"],
    })
      .notNull()
      .default("SONG"),

    videoId: text("video_id").primaryKey(),

    name: text("name").notNull().default("Unknown"),
    artist: text("artist").notNull().default("Unknown"),

    duration: integer("duration"),
    thumbnails: text("thumbnails").notNull().default(""),
  },
  (table) => ({
    artistIdx: index("tracks_artist_idx").on(table.artist),
    nameIdx: index("tracks_name_idx").on(table.name),
  }),
);

export const history = sqliteTable(
  "history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    videoId: text("video_id")
      .notNull()
      .references(() => tracks.videoId, { onDelete: "cascade" }),

    playedAt: text("played_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    videoIdIdx: index("history_video_id_idx").on(table.videoId),
    playedAtIdx: index("history_played_at_idx").on(table.playedAt),
  }),
);

export const favorites = sqliteTable("favorites", {
  videoId: text("video_id")
    .primaryKey()
    .references(() => tracks.videoId, { onDelete: "cascade" }),

  addedAt: text("added_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const playlists = sqliteTable(
  "playlists",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    name: text("name").notNull(),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    nameIdx: uniqueIndex("playlists_name_unique_idx").on(table.name),
  }),
);

export const playlistItems = sqliteTable(
  "playlist_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    playlistId: integer("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),

    videoId: text("video_id")
      .notNull()
      .references(() => tracks.videoId, { onDelete: "cascade" }),

    position: integer("position").notNull(),

    addedAt: text("added_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    playlistPositionUnique: uniqueIndex(
      "playlist_items_playlist_position_unique_idx",
    ).on(table.playlistId, table.position),

    playlistTrackUnique: uniqueIndex(
      "playlist_items_playlist_track_unique_idx",
    ).on(table.playlistId, table.videoId),

    playlistIdIdx: index("playlist_items_playlist_id_idx").on(table.playlistId),
    videoIdIdx: index("playlist_items_video_id_idx").on(table.videoId),
  }),
);

export const lyrics = sqliteTable(
  "lyrics",
  {
    videoId: text("video_id")
      .primaryKey()
      .references(() => tracks.videoId, { onDelete: "cascade" }),

    lrcLibId: integer("lrclib_id"),

    trackName: text("track_name").notNull(),
    artistName: text("artist_name").notNull(),
    albumName: text("album_name"),

    duration: integer("duration"),
    instrumental: integer("instrumental", { mode: "boolean" })
      .notNull()
      .default(false),

    plainLyrics: text("plain_lyrics"),
    syncedLyrics: text("synced_lyrics"),

    fetchedAt: text("fetched_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    trackNameIdx: index("lyrics_track_name_idx").on(table.trackName),
    artistNameIdx: index("lyrics_artist_name_idx").on(table.artistName),
  }),
);

export const lyricsRelations = relations(lyrics, ({ one }) => ({
  track: one(tracks, {
    fields: [lyrics.videoId],
    references: [tracks.videoId],
  }),
}));

export const tracksRelations = relations(tracks, ({ many }) => ({
  history: many(history),
  favorites: many(favorites),
  playlistItems: many(playlistItems),
}));

export const historyRelations = relations(history, ({ one }) => ({
  track: one(tracks, {
    fields: [history.videoId],
    references: [tracks.videoId],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  track: one(tracks, {
    fields: [favorites.videoId],
    references: [tracks.videoId],
  }),
}));

export const playlistsRelations = relations(playlists, ({ many }) => ({
  items: many(playlistItems),
}));

export const playlistItemsRelations = relations(playlistItems, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistItems.playlistId],
    references: [playlists.id],
  }),

  track: one(tracks, {
    fields: [playlistItems.videoId],
    references: [tracks.videoId],
  }),
}));

export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;

export type History = typeof history.$inferSelect;
export type NewHistory = typeof history.$inferInsert;

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;

export type Playlist = typeof playlists.$inferSelect;
export type NewPlaylist = typeof playlists.$inferInsert;

export type PlaylistItem = typeof playlistItems.$inferSelect;
export type NewPlaylistItem = typeof playlistItems.$inferInsert;

export type Lyrics = typeof lyrics.$inferSelect;
export type NewLyrics = typeof lyrics.$inferInsert;