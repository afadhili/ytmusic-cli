import { Box, Text } from "ink";
import { Lyrics } from "../db/schema.js";
import SelectInput from "./select-input.js";

export type LyricsData = {
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

type SyncedLine = {
  time: number;
  text: string;
};

type LyricsViewProps = {
  lyrics: Lyrics | null;
  position?: number;
  height?: number;
  showHeader?: boolean;
};

function parseTimestamp(timestamp: string): number {
  const [minutePart, secondPart] = timestamp.split(":");

  const minutes = Number(minutePart);
  const seconds = Number(secondPart);

  if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
    return 0;
  }

  return minutes * 60 + seconds;
}

function parseSyncedLyrics(value: string): SyncedLine[] {
  return value
    .split("\n")
    .map((line) => {
      const match = line.match(/^\[(\d{2}:\d{2}(?:\.\d{1,3})?)\]\s?(.*)$/);

      if (!match) return null;

      return {
        time: parseTimestamp(match[1]),
        text: match[2].trim(),
      };
    })
    .filter((line): line is SyncedLine => Boolean(line));
}

function getCurrentLineIndex(lines: SyncedLine[], position: number): number {
  if (lines.length === 0) return -1;

  let currentIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    if (position >= lines[i].time) {
      currentIndex = i;
    } else {
      break;
    }
  }

  return currentIndex;
}

export default function LyricsView({
  lyrics,
  position = 0,
  height = 9,
  showHeader = true,
}: LyricsViewProps) {
  if (!lyrics) {
    return (
      <Box flexDirection="column">
        <Text bold>Lyrics</Text>
        <Text dimColor>No lyrics loaded</Text>
      </Box>
    );
  }

  if (lyrics.instrumental) {
    return (
      <Box flexDirection="column">
        <Text bold>Lyrics</Text>
        <Text dimColor>Instrumental track</Text>
      </Box>
    );
  }

  const syncedLines = lyrics.syncedLyrics
    ? parseSyncedLyrics(lyrics.syncedLyrics)
    : [];

  if (syncedLines.length > 0) {
    const currentIndex = getCurrentLineIndex(syncedLines, position);

    const half = Math.floor(height / 2);
    const start = Math.max(0, currentIndex - half);
    const visibleLines = syncedLines.slice(start, start + height);

    return (
      <Box flexDirection="column">
        {showHeader && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>Lyrics</Text>
            <Text dimColor>
              {lyrics.trackName} - {lyrics.artistName}
            </Text>
          </Box>
        )}

        <Box flexDirection="column">
          {visibleLines.map((line, index) => {
            const absoluteIndex = start + index;
            const isCurrent = absoluteIndex === currentIndex;

            return (
              <Text
                key={`${line.time}-${index}`}
                bold={isCurrent}
                color={isCurrent ? "cyan" : undefined}
                dimColor={!isCurrent}
                wrap="wrap"
              >
                {isCurrent && line.text ? "▶ " : "  "}
                {line.text || ""}
              </Text>
            );
          })}
        </Box>
      </Box>
    );
  }

  if (lyrics.plainLyrics) {
    const lines = lyrics.plainLyrics
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return (
      <Box flexDirection="column">
        {showHeader && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>Plain Lyrics (can't find synced lyrics)</Text>
            <Text dimColor>
              {lyrics.trackName} - {lyrics.artistName}
            </Text>
          </Box>
        )}

        <SelectInput
          items={lines.map((line, index) => {
            return {
              label: line,
              value: line + index,
            };
          })}
          noTab
          indicator=""
          wrap="wrap"
          itemsPerPage={height - 1}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Lyrics</Text>
      <Text dimColor>No lyrics available</Text>
    </Box>
  );
}
