import { Box, Text, useInput } from "ink";
import { useState } from "react";
import { eq } from "drizzle-orm";

import type { Track } from "../types/yt-music.types.js";
import {
  getNextTracks,
  searchTracks,
  playMusic,
} from "../services/yt-music.js";

import { Spinner, TextInput } from "@inkjs/ui";
import SelectInput from "../components/select-input.js";
import Help, { type HelpItems } from "../components/help.js";
import useAppStore from "../app.store.js";

import db from "../db/index.js";
import { favorites, tracks as tracksTable } from "../db/schema.js";

type Mode = "search" | "select";

async function checkIsFavorite(track: Track): Promise<boolean> {
  const result = await db.query.favorites.findFirst({
    where: eq(favorites.videoId, track.videoId),
  });

  return Boolean(result);
}

async function toggleFavorite(
  track: Track,
  currentValue: boolean,
): Promise<boolean> {
  if (currentValue) {
    await db.delete(favorites).where(eq(favorites.videoId, track.videoId));
    return false;
  }

  await db
    .insert(tracksTable)
    .values(track)
    .onConflictDoUpdate({
      target: tracksTable.videoId,
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

export default function Search() {
  const { tab, setScreen, setTracks, setTracksType } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [tracks, setSearchResults] = useState<Track[]>([]);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("search");

  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const helpList: HelpItems =
    mode === "search"
      ? [
          ["Typing", "Search"],
          ["Esc", tracks.length > 0 ? "Back to list" : "Back"],
        ]
      : [
          ["", "Select history"],
          ["󰌑", "Play track"],
          ["/", "Filter"],
          ["f", isFavorite ? "Unfavorite" : "Favorite"],
          ["p", "Playlist"],
          ["r", "Reload"],
          ["q", "Back"],
        ];

  useInput(
    async (input, key) => {
      if (tab !== "search") return;

      if (mode === "search") {
        if (key.escape && tracks.length > 0) {
          setMode("select");
        } else if (key.escape) {
          setScreen("home");
        }

        return;
      }

      if (input === "q" || key.escape) {
        setScreen("home");
        return;
      }

      if (input === "/") {
        setMode("search");
        return;
      }

      if (input === "f") {
        if (!selectedTrack) return;

        const nextFavorite = await toggleFavorite(selectedTrack, isFavorite);
        setIsFavorite(nextFavorite);
        return;
      }
    },
    { isActive: tab === "search" },
  );

  const handleSearch = async () => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setSelectedTrack(null);
      setIsFavorite(false);
      setMode("search");
      return;
    }

    setLoading(true);

    try {
      const result = await searchTracks(trimmedQuery);
      const safeResult = result ?? [];

      setSearchResults(safeResult);

      const firstTrack = safeResult[0] ?? null;
      setSelectedTrack(firstTrack);

      if (firstTrack) {
        setIsFavorite(await checkIsFavorite(firstTrack));
      } else {
        setIsFavorite(false);
      }

      setMode(safeResult.length > 0 ? "select" : "search");
    } catch (err) {
      console.error(err);
      setSearchResults([]);
      setSelectedTrack(null);
      setIsFavorite(false);
      setMode("search");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = async (track: Track) => {
    const nexts = await getNextTracks(track.videoId);
    const queue = [track, ...(nexts ?? [])];

    setTracks(queue, 0);
    setTracksType("auto");

    await playMusic(track);
  };

  const inputDisabled = mode !== "search" || tab !== "search";
  const selectFocused = mode === "select" && tab === "search";

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Text>Search: </Text>
        <TextInput
          defaultValue={query}
          onChange={setQuery}
          onSubmit={handleSearch}
          isDisabled={inputDisabled}
        />
      </Box>

      {loading && (
        <Box gap={2}>
          <Spinner />
          <Text>Searching...</Text>
        </Box>
      )}

      {tracks.length > 0 && (
        <Box>
          <SelectInput
            items={tracks.map((track) => ({
              label: `${track.artist} - ${track.name}`,
              value: track,
            }))}
            onSelect={({ value }) => {
              handlePlayTrack(value).catch(console.error);
            }}
            onChange={async ({ value }) => {
              setSelectedTrack(value);
              setIsFavorite(await checkIsFavorite(value));
            }}
            focused={selectFocused}
            showNumber
          />
        </Box>
      )}

      <Help items={helpList} />
    </Box>
  );
}
