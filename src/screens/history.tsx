import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { Spinner, TextInput } from "@inkjs/ui";

import useAppStore from "../app.store.js";
import SelectInput from "../components/select-input.js";
import Help, { type HelpItems } from "../components/help.js";
import { getHistory, type HistoryTrack } from "../services/history.js";
import { getNextTracks, playMusic } from "../services/yt-music.js";
import { type Track } from "../db/schema.js";
import { checkIsFavorite, toggleFavorite } from "../services/favorites.js";

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

export default function History() {
  const { tab, setScreen, setTracks, setTracksType } = useAppStore();

  const [query, setQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [mode, setMode] = useState<"filter" | "list">("list");
  const filterFocused = mode === "filter" && tab === "history";
  const listFocused = mode === "list" && tab === "history";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryTrack[]>([]);

  const helpList: HelpItems =
    mode === "filter"
      ? [
          ["Typing", "Filter"],
          ["Esc", "Back to list"],
        ]
      : [
          ["", "Select history"],
          ["󰌑", "Play track"],
          ["/", "Filter"],
          ["f", isFavorite ? "Unfavorite" : "Favorite"],
          ["r", "Reload"],
          ["q", "Back"],
        ];

  async function loadHistory(searchQuery = query) {
    setLoading(true);

    try {
      const result = await getHistory(50, searchQuery);
      setItems(result);

      const firstTrack = result[0]?.track ?? null;
      setSelectedTrack(firstTrack);

      if (firstTrack) {
        setIsFavorite(await checkIsFavorite(firstTrack));
      } else {
        setIsFavorite(false);
      }
    } catch (err) {
      console.error(err);
      setItems([]);
      setSelectedTrack(null);
      setIsFavorite(false);
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

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadHistory(query).catch(console.error);
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  useInput(
    async (input, key) => {
      if (tab !== "history") return;

      if (key.escape) {
        if (mode === "filter") {
          setMode("list");
          return;
        }

        setScreen("home");
        return;
      }

      if (input === "/") {
        setMode("filter");
        return;
      }

      if (mode !== "list") return;

      if (input === "q") {
        setScreen("home");
        return;
      }

      if (input === "r") {
        await loadHistory(query);
        return;
      }

      if (input === "f") {
        if (!selectedTrack) return;

        const nextFavorite = await toggleFavorite(selectedTrack, isFavorite);
        setIsFavorite(nextFavorite);
        return;
      }
    },
    { isActive: tab === "history" },
  );

  return (
    <Box flexDirection="column" gap={1}>
      <Box gap={3}>
        <Text bold>History</Text>
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
          <Text>Loading history...</Text>
        </Box>
      )}

      {!loading && items.length === 0 && (
        <Text dimColor>No listening history found</Text>
      )}

      {!loading && items.length > 0 && (
        <SelectInput<Track>
          items={items.map((item) => ({
            label: `${item.track.artist} - ${item.track.name} (${formatDate(
              item.playedAt,
            )})`,
            value: item.track,
          }))}
          onSelect={(item) => {
            handlePlayTrack(item.value).catch(console.error);
          }}
          onChange={async (item) => {
            setSelectedTrack(item.value);
            setIsFavorite(await checkIsFavorite(item.value));
          }}
          focused={listFocused}
          showNumber
          loop
        />
      )}
    </Box>
  );
}
