import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { Spinner, TextInput } from "@inkjs/ui";

import useAppStore from "../app.store.js";
import SelectInput from "../components/select-input.js";
import Help, { type HelpItems } from "../components/help.js";
import type { Track } from "../db/schema.js";
import { getNextTracks, playMusic } from "../services/yt-music.js";
import {
  getFavorites,
  toggleFavorite,
  type FavoriteTrack,
} from "../services/favorites.js";

type Mode = "filter" | "list";

function formatDate(value: string): string {
  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T") + "Z";

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour12: false,
  });
}

export default function Favorites() {
  const { tab, setScreen, setTracks, setTracksType } = useAppStore();

  const [mode, setMode] = useState<Mode>("list");
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FavoriteTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const filterFocused = tab === "favorites" && mode === "filter";
  const listFocused = tab === "favorites" && mode === "list";

  const helpList: HelpItems =
    mode === "filter"
      ? [
          ["Typing", "Filter favorites"],
          ["Esc", "Back to list"],
        ]
      : [
          ["", "Select favorite"],
          ["󰌑", "Play track"],
          ["/", "Filter"],
          ["f/d", "Remove favorite"],
          ["r", "Reload"],
          ["q", "Back"],
        ];

  async function loadFavorites(searchQuery = query) {
    setLoading(true);

    try {
      const result = await getFavorites(searchQuery);

      setItems(result);
      setSelectedTrack(result[0]?.track ?? null);
    } catch (err) {
      console.error(err);
      setItems([]);
      setSelectedTrack(null);
    } finally {
      setLoading(false);
    }
  }

  async function handlePlayTrack(track: Track) {
    const nexts = await getNextTracks(track.videoId);

    setTracks([track, ...(nexts ?? [])], 0);
    setTracksType("auto");

    await playMusic(track);
  }

  async function handleRemoveFavorite(track: Track) {
    await toggleFavorite(track, true);

    const nextItems = items.filter(
      (item) => item.track.videoId !== track.videoId,
    );

    setItems(nextItems);
    setSelectedTrack(nextItems[0]?.track ?? null);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadFavorites(query).catch(console.error);
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  useInput(
    async (input, key) => {
      if (tab !== "favorites") return;

      if (mode === "filter") {
        if (key.escape) {
          setMode("list");
        }

        return;
      }

      if (input === "q" || key.escape) {
        setScreen("home");
        return;
      }

      if (input === "/") {
        setMode("filter");
        return;
      }

      if (input === "r") {
        await loadFavorites(query);
        return;
      }

      if (input === "f" || input === "d") {
        if (!selectedTrack) return;

        await handleRemoveFavorite(selectedTrack);
      }
    },
    { isActive: tab === "favorites" },
  );

  return (
    <Box flexDirection="column" gap={1}>
      <Box gap={3}>
        <Text bold>Favorites</Text>
        <Help items={helpList} />
      </Box>

      <Box>
        <Text>Filter: </Text>
        <TextInput
          defaultValue={query}
          onChange={setQuery}
          isDisabled={!filterFocused}
        />
      </Box>

      {loading && (
        <Box gap={2}>
          <Spinner />
          <Text>Loading favorites...</Text>
        </Box>
      )}

      {!loading && items.length === 0 && (
        <Text dimColor>No favorite tracks found</Text>
      )}

      {!loading && items.length > 0 && (
        <SelectInput<Track>
          items={items.map((item) => ({
            label: ` ${item.track.artist} - ${item.track.name} (${formatDate(
              item.addedAt,
            )})`,
            value: item.track,
          }))}
          onSelect={(item) => {
            handlePlayTrack(item.value).catch(console.error);
          }}
          onChange={(item) => {
            setSelectedTrack(item.value);
          }}
          focused={listFocused}
          showNumber
          loop
        />
      )}
    </Box>
  );
}
