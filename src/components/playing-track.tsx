import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import useAppStore from "../app.store.js";
import SelectInput from "./select-input.js";
import { playMusic, playNext, playPrev } from "../services/yt-music.js";
import { ASCII_CONFIG, urlToBuffer } from "../lib/get-thumbnail.js";
import { imageToAscii } from "../lib/image-to-ascii.js";
import { seekBackward, seekForward, togglePause } from "../services/mpv.js";
import { usePlaybackState } from "../hooks/use-playback-state.js";
import { ProgressBar, Spinner } from "@inkjs/ui";
import Help, { HelpItems } from "./help.js";
import { loadConfig } from "../lib/config.js";
import LyricsView from "./lyrics-view.js";
import { getLyrics } from "../services/lyrics.js";
import { Lyrics } from "../db/schema.js";
import {
  addTrackToPlaylist,
  getPlaylists,
  type PlaylistWithCount,
} from "../services/playlists.js";
import { fileURLToPath } from "node:url";

export default function PlayingTrack() {
  const {
    tab,
    tracks,
    currentIndex,
    playTrackAt,
    moveTrackUp,
    moveTrackDown,
    removeTrack,
  } = useAppStore();

  const { position, duration, paused } = usePlaybackState(500);

  const [ascii, setAscii] = useState("");
  const [asciiLoading, setAsciiLoading] = useState(false);

  const [selectedTrack, setSelectedTrack] = useState<number>(0);

  const [mode, setMode] = useState<"list" | "lyric" | "addtoplaylist">("list");

  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  const [playlists, setPlaylists] = useState<PlaylistWithCount[]>([]);
  const [message, setMessage] = useState("");

  const playingTrack = tracks[currentIndex] ?? null;
  const selectedQueueTrack = tracks[selectedTrack] ?? playingTrack;

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  async function openAddToPlaylistMode() {
    setMessage("");

    const targetTrack = selectedQueueTrack;

    if (!targetTrack) {
      setMessage("No track selected");
      return;
    }

    try {
      const res = await getPlaylists();

      if (res.length === 0) {
        setMessage("No playlists available");
        return;
      }

      setPlaylists(res);
      setMode("addtoplaylist");
    } catch (err) {
      console.error(err);
      setMessage("Failed to load playlists");
    }
  }

  async function handleAddToPlaylist(playlist: PlaylistWithCount) {
    const targetTrack = selectedQueueTrack;

    if (!targetTrack) {
      setMessage("No track selected");
      setMode("list");
      return;
    }

    try {
      await addTrackToPlaylist(playlist.id, targetTrack);

      setMode("list");
    } catch (err) {
      console.error(err);
      setMessage("Failed to add track to playlist");
      setMode("list");
    }
  }

  useInput(async (input, key) => {
    if (tab !== "preview") return;

    if (mode === "addtoplaylist") {
      if (key.escape || input === "q") {
        setMode("list");
        setMessage("");
      }

      return;
    }

    if (key.rightArrow) {
      seekForward();
      return;
    }

    if (key.leftArrow) {
      seekBackward();
      return;
    }

    if (input === " ") {
      togglePause();
      return;
    }

    if (input === "n") {
      playNext();
      return;
    }

    if (input === "b") {
      playPrev();
      return;
    }

    if (input === "u") {
      moveTrackUp(selectedTrack);
      return;
    }

    if (input === "j") {
      moveTrackDown(selectedTrack);
      return;
    }

    if (input === "a") {
      await openAddToPlaylistMode();
      return;
    }

    if (input === "l" && mode === "list") {
      setLyricsLoading(true);
      fetchLyrics().then(() => setLyricsLoading(false));
      return;
    }

    if (input === "l" && mode === "lyric") {
      setMode("list");
      return;
    }

    if (key.delete) {
      if (selectedTrack === currentIndex) {
        playNext();
      }

      await removeTrack(selectedTrack);
    }
  });

  const fetchLyrics = async () => {
    setMode("lyric");

    const currentTrack = tracks[currentIndex];
    if (!currentTrack) return;

    if (lyrics?.trackName === currentTrack.name) return;

    const res = await getLyrics(currentTrack);
    setLyrics(res);
  };

  useEffect(() => {
    if (mode === "list") return;
    if (!playingTrack) return;
    if (mode !== "lyric") return;

    setLyricsLoading(true);
    fetchLyrics().then(() => setLyricsLoading(false));
  }, [currentIndex, playingTrack?.videoId]);

  useEffect(() => {
    if (!ascii) getDefaultAscii();
  }, []);

  const getDefaultAscii = async () => {
    try {
      const placeholderPath = fileURLToPath(
        new URL("../assets/placeholder.png", import.meta.url),
      );
      const def = await imageToAscii(placeholderPath, ASCII_CONFIG);
      setAscii(def);
    } catch (error) {}
  };

  const helpList: HelpItems =
    mode === "addtoplaylist"
      ? [
          ["", "Select playlist"],
          ["󰌑", "Add to playlist"],
          ["Esc", "Cancel"],
        ]
      : [
          ["󱁐", "Pause"],
          ["󰹳", `Skip/Back ${loadConfig().seekSeconds}s`],
          ["b", "Prev"],
          ["n", "Skip"],
          ["u", "Move up"],
          ["j", "Move down"],
          ["a", "Add to playlist"],
          ["l", "Lyrics"],
          ["del", "Remove"],
        ];

  useEffect(() => {
    let cancelled = false;

    async function getAscii() {
      if (!playingTrack?.thumbnails) {
        setAscii("");
        return;
      }

      setAsciiLoading(true);
      setAscii("");

      try {
        const buffer = await urlToBuffer(playingTrack.thumbnails);
        const result = await imageToAscii(buffer, ASCII_CONFIG);

        if (!cancelled) {
          setAscii(result);
        }
      } catch (err) {
        if (!cancelled) {
          setAscii("");
          console.error("Failed to load thumbnail ascii:", err);
        }
      } finally {
        if (!cancelled) {
          setAsciiLoading(false);
        }
      }
    }

    getAscii();

    return () => {
      cancelled = true;
    };
  }, [playingTrack?.videoId, playingTrack?.thumbnails]);

  if (!playingTrack) {
    return (
      <Box
        borderStyle="round"
        borderDimColor={tab !== "preview"}
        justifyContent="center"
        flexDirection="column"
        alignItems="center"
      >
        <Box gap={1} marginTop={1} padding={1} justifyContent="space-between">
          <Box
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            width="40%"
          >
            <Box
              alignItems="center"
              justifyContent="center"
              minHeight={ASCII_CONFIG.width * 0.4}
            >
              <Text dimColor wrap="hard">
                {ascii ? ascii : ""}
              </Text>
            </Box>
            <Box
              marginTop={1}
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
            >
              <Box
                minWidth={30}
                flexDirection="column"
                marginBottom={1}
                marginRight={1}
              >
                <ProgressBar value={0} />

                <Box alignSelf="center">
                  <Text dimColor>
                    {"  "}
                    {formatTime(0)}/{formatTime(0)}
                  </Text>
                </Box>
              </Box>
            </Box>
          </Box>
          <Box flexDirection="column" width="60%">
            <Box flexDirection="column" marginBottom={1}>
              <Text bold dimColor>
                No Track Playing
              </Text>
              <Text dimColor>
                Start playing song by searching or play your playlist
              </Text>
            </Box>
          </Box>
        </Box>
        <Help items={helpList} />
      </Box>
    );
  }

  const percent = duration > 0 ? Math.round((position / duration) * 100) : 0;

  return (
    <Box
      borderStyle="round"
      borderDimColor={tab !== "preview"}
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      <Box gap={1} marginTop={1} padding={1} justifyContent="space-between">
        <Box
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width="40%"
        >
          <Box minHeight={ASCII_CONFIG.width * 0.4}>
            {asciiLoading ? (
              <Text dimColor>Loading cover...</Text>
            ) : ascii ? (
              <Text wrap="hard">{ascii}</Text>
            ) : (
              <Text dimColor>No cover</Text>
            )}
          </Box>

          <Box
            marginTop={1}
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
          >
            <Box
              minWidth={30}
              flexDirection="column"
              marginBottom={1}
              marginRight={1}
            >
              <ProgressBar value={percent} />

              <Box alignSelf="center">
                <Text dimColor>
                  {paused ? "  " : "  "}
                  {formatTime(position)}/{formatTime(duration)}
                </Text>
              </Box>
            </Box>

            {message && (
              <Box marginTop={1}>
                <Text color="yellow">{message}</Text>
              </Box>
            )}
          </Box>
        </Box>

        {mode === "list" && (
          <Box flexDirection="column" width="60%">
            <Box flexDirection="column" marginBottom={1}>
              <Text bold>Now Playing</Text>
              <Text dimColor>
                {tracks[currentIndex].name} - {tracks[currentIndex].artist}
              </Text>
            </Box>
            {tracks.length === 0 ? (
              <Text dimColor>Queue is empty</Text>
            ) : (
              <SelectInput<number>
                items={tracks.map((track, index) => {
                  const isPlaying = index === currentIndex;
                  const prefix = isPlaying
                    ? "▶"
                    : index < currentIndex
                      ? "↑"
                      : "↓";

                  return {
                    label: `${prefix} ${track.artist} - ${track.name}`,
                    value: index,
                  };
                })}
                onChange={(item) => {
                  setSelectedTrack(item.value);
                }}
                indicator=""
                itemsPerPage={7}
                onSelect={({ value }) => {
                  const track = tracks[value];

                  if (!track) return;
                  if (value === currentIndex) return;

                  playTrackAt(value);
                  playMusic(track).catch(console.error);
                }}
                focused={tab === "preview" && mode === "list"}
              />
            )}
          </Box>
        )}

        {mode === "lyric" && (
          <Box width="60%">
            {lyricsLoading ? (
              <Box>
                <Box flexDirection="column" marginBottom={1}>
                  <Box>
                    <Spinner />
                    <Text bold>{"  "}Loading lyrics..</Text>
                  </Box>

                  <Text dimColor>
                    {tracks[currentIndex].name} - {tracks[currentIndex].artist}
                  </Text>
                </Box>
              </Box>
            ) : (
              <LyricsView lyrics={lyrics} position={position} height={8} />
            )}
          </Box>
        )}

        {mode === "addtoplaylist" && (
          <Box flexDirection="column" width="60%">
            <Text bold>Add to playlist</Text>

            <Text dimColor>
              Track: {selectedQueueTrack?.artist} - {selectedQueueTrack?.name}
            </Text>

            <Box marginTop={1}>
              <SelectInput<PlaylistWithCount>
                items={playlists.map((playlist) => ({
                  label: `${playlist.name} (${playlist.totalTracks})`,
                  value: playlist,
                }))}
                onSelect={(item) => {
                  handleAddToPlaylist(item.value).catch(console.error);
                }}
                focused={tab === "preview" && mode === "addtoplaylist"}
                showNumber
                loop
              />
            </Box>
          </Box>
        )}
      </Box>

      <Help items={helpList} />
    </Box>
  );
}
