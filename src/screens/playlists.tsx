import { Box, Text, useInput } from "ink";
import { Spinner, TextInput } from "@inkjs/ui";
import { useEffect, useMemo, useState } from "react";

import useAppStore from "../app.store.js";
import SelectInput from "../components/select-input.js";
import Help, { type HelpItems } from "../components/help.js";

import {
  createPlaylist,
  deletePlaylist,
  getPlaylists,
  getPlaylistTracks,
  moveTrackUp,
  moveTrackDown,
  removeTrackFromPlaylist,
  type PlaylistTrack,
  type PlaylistWithCount,
} from "../services/playlists.js";

import type { Track } from "../types/yt-music.types.js";
import { playMusic } from "../services/yt-music.js";

type Mode = "list" | "create" | "right";

export default function Playlists() {
  const { tab, setScreen, setTracks, setTracksType } = useAppStore();

  const [mode, setMode] = useState<Mode>("list");

  const [playlists, setPlaylists] = useState<PlaylistWithCount[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<PlaylistWithCount | null>(null);

  const [activeTracks, setActiveTracks] = useState<PlaylistTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<PlaylistTrack | null>(
    null,
  );

  const [isLoading, setLoading] = useState(true);
  const [tracksLoading, setTracksLoading] = useState(false);

  const [playlistName, setPlaylistName] = useState("");
  const [message, setMessage] = useState("");

  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteTrackTargetId, setDeleteTrackTargetId] = useState<number | null>(
    null,
  );

  const listFocused = tab === "playlists" && mode === "list";
  const createFocused = tab === "playlists" && mode === "create";
  const rightFocused = tab === "playlists" && mode === "right";

  const helpList: HelpItems =
    mode === "create"
      ? [
          ["Typing", "Playlist name"],
          ["󰌑", "Create"],
          ["Esc", "Cancel"],
        ]
      : mode === "right"
        ? [
            ["", "Select track"],
            ["del", "Remove track"],
            ["←", "Back to playlists"],
            ["u", "Move tracks up"],
            ["j", "Move tracks down"],
            ["r", "Reload"],
            ["q", "Back"],
          ]
        : [
            ["", "Select playlist"],
            ["→", "Tracks"],
            ["n", "New playlist"],
            ["r", "Reload"],
            ["del", "Remove playlist"],
            ["q", "Back"],
          ];

  const playlistItems = useMemo(() => {
    return playlists.map((playlist) => ({
      label: `${
        deleteTargetId === playlist.id ? "󰆴 " : ""
      }${playlist.name} (${playlist.totalTracks})`,
      value: playlist,
    }));
  }, [playlists, deleteTargetId]);

  const trackItems = useMemo(() => {
    return activeTracks.map((track, index) => ({
      label: `${
        deleteTrackTargetId === track.playlistItemId ? "󰆴 " : ""
      }${index + 1}. ${track.artist} - ${track.name}`,
      value: {
        track,
        index,
      },
    }));
  }, [activeTracks, deleteTrackTargetId]);

  async function fetchPlaylists() {
    setLoading(true);
    setMessage("");
    setDeleteTargetId(null);
    setDeleteTrackTargetId(null);

    try {
      const res = await getPlaylists();

      setPlaylists(res);

      const firstPlaylist = res[0] ?? null;
      setSelectedPlaylist(firstPlaylist);

      if (!firstPlaylist) {
        setActiveTracks([]);
        setSelectedTrack(null);
      }
    } catch (err) {
      console.error(err);
      setPlaylists([]);
      setSelectedPlaylist(null);
      setActiveTracks([]);
      setSelectedTrack(null);
      setMessage("Failed to load playlists");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePlaylist() {
    const name = playlistName.trim();

    if (!name) {
      setMessage("Playlist name cannot be empty");
      return;
    }

    setLoading(true);
    setMessage("");
    setDeleteTargetId(null);
    setDeleteTrackTargetId(null);

    try {
      await createPlaylist(name);

      setPlaylistName("");
      setMode("list");

      await fetchPlaylists();
    } catch (err) {
      console.error(err);
      setMessage("Failed to create playlist");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePlaylist() {
    if (!selectedPlaylist) {
      setMessage("No playlist selected");
      return;
    }

    if (deleteTargetId !== selectedPlaylist.id) {
      setDeleteTargetId(selectedPlaylist.id);
      setMessage(`Press delete again to remove "${selectedPlaylist.name}"`);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await deletePlaylist(selectedPlaylist.id);

      const nextPlaylists = playlists.filter(
        (playlist) => playlist.id !== selectedPlaylist.id,
      );

      const nextSelected = nextPlaylists[0] ?? null;

      setPlaylists(nextPlaylists);
      setSelectedPlaylist(nextSelected);
      setDeleteTargetId(null);
      setDeleteTrackTargetId(null);

      if (!nextSelected) {
        setActiveTracks([]);
        setSelectedTrack(null);
        setMode("list");
      }

      setMessage(`Removed playlist: ${selectedPlaylist.name}`);
    } catch (err) {
      console.error(err);
      setMessage("Failed to remove playlist");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTrackFromPlaylist() {
    if (!selectedTrack) {
      setMessage("No track selected");
      return;
    }

    if (deleteTrackTargetId !== selectedTrack.playlistItemId) {
      setDeleteTrackTargetId(selectedTrack.playlistItemId);
      setMessage(`Press delete again to remove "${selectedTrack.name}"`);
      return;
    }

    setTracksLoading(true);
    setMessage("");

    try {
      await removeTrackFromPlaylist(selectedTrack.playlistItemId);

      const removedIndex = activeTracks.findIndex(
        (track) => track.playlistItemId === selectedTrack.playlistItemId,
      );

      const nextTracks = activeTracks.filter(
        (track) => track.playlistItemId !== selectedTrack.playlistItemId,
      );

      const nextSelected =
        nextTracks[
          Math.min(Math.max(removedIndex, 0), nextTracks.length - 1)
        ] ?? null;

      setActiveTracks(nextTracks);
      setSelectedTrack(nextSelected);
      setDeleteTrackTargetId(null);

      setMessage(`Removed track: ${selectedTrack.name}`);
    } catch (err) {
      console.error(err);
      setMessage("Failed to remove track from playlist");
    } finally {
      setTracksLoading(false);
    }
  }

  async function handlePlayPlaylist(playlist: PlaylistWithCount) {
    if (activeTracks.length === 0) {
      setMessage(`Playlist "${playlist.name}" is empty`);
      return;
    }

    const firstTrack = activeTracks[0];

    if (!firstTrack) {
      setMessage(`Playlist "${playlist.name}" is empty`);
      return;
    }

    setTracks(activeTracks as Track[], 0);
    setTracksType("playlist");

    await playMusic(firstTrack);
  }

  async function handlePlayTrack(track: PlaylistTrack, index: number) {
    if (activeTracks.length === 0) return;

    setTracks(activeTracks as Track[], index);
    setTracksType("playlist");

    await playMusic(track);
  }

  async function handleMoveTrackUp() {
    if (!selectedPlaylist || !selectedTrack) return;

    await moveTrackUp(selectedPlaylist.id, selectedTrack.playlistItemId);

    const res = await getPlaylistTracks(selectedPlaylist.id);
    setActiveTracks(res);

    const nextSelected = res.find(
      (track) => track.playlistItemId === selectedTrack.playlistItemId,
    );

    setSelectedTrack(nextSelected ?? null);
  }

  async function handleMoveTrackDown() {
    if (!selectedPlaylist || !selectedTrack) return;

    await moveTrackDown(selectedPlaylist.id, selectedTrack.playlistItemId);

    const res = await getPlaylistTracks(selectedPlaylist.id);
    setActiveTracks(res);

    const nextSelected = res.find(
      (track) => track.playlistItemId === selectedTrack.playlistItemId,
    );

    setSelectedTrack(nextSelected ?? null);
  }

  useEffect(() => {
    fetchPlaylists().catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedPlaylist) {
      setActiveTracks([]);
      setSelectedTrack(null);
      return;
    }

    let cancelled = false;

    async function loadTracks() {
      setTracksLoading(true);

      try {
        if (!selectedPlaylist) return;
        const res = await getPlaylistTracks(selectedPlaylist.id);

        if (!cancelled) {
          setActiveTracks(res);
          setSelectedTrack(res[0] ?? null);
          setDeleteTrackTargetId(null);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setActiveTracks([]);
          setSelectedTrack(null);
        }
      } finally {
        if (!cancelled) {
          setTracksLoading(false);
        }
      }
    }

    loadTracks();

    return () => {
      cancelled = true;
    };
  }, [selectedPlaylist?.id]);

  useEffect(() => {
    if (deleteTargetId === null) return;

    const timeout = setTimeout(() => {
      setDeleteTargetId(null);
      setMessage("");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [deleteTargetId]);

  useEffect(() => {
    if (deleteTrackTargetId === null) return;

    const timeout = setTimeout(() => {
      setDeleteTrackTargetId(null);
      setMessage("");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [deleteTrackTargetId]);

  useInput(
    async (input, key) => {
      if (tab !== "playlists") return;

      if (mode === "create") {
        if (key.escape) {
          setMode("list");
          setPlaylistName("");
          setMessage("");
          setDeleteTargetId(null);
          setDeleteTrackTargetId(null);
        }

        return;
      }

      if (input === "q" || key.escape) {
        setScreen("home");
        return;
      }

      if (input === "r") {
        await fetchPlaylists();
        return;
      }

      if (input === "n" && mode === "list") {
        setMode("create");
        setMessage("");
        setDeleteTargetId(null);
        setDeleteTrackTargetId(null);
        return;
      }

      if (key.delete && mode === "list") {
        await handleDeletePlaylist();
        return;
      }

      if (key.delete && mode === "right") {
        await handleDeleteTrackFromPlaylist();
        return;
      }

      if (input === "u" && mode === "right") {
        try {
          await handleMoveTrackUp();
        } catch (err) {
          console.error("moveUp error:", err);
          setMessage("Failed to move track up");
        }
        return;
      }

      if (input === "j" && mode === "right") {
        try {
          await handleMoveTrackDown();
        } catch (err) {
          console.error("moveDown error:", err);
          setMessage("Failed to move track down");
        }
        return;
      }

      if (key.rightArrow && mode === "list") {
        if (!selectedPlaylist) return;

        if (activeTracks.length === 0) {
          setMessage(`Playlist "${selectedPlaylist.name}" is empty`);
          return;
        }

        setMode("right");
        setMessage("");
        setDeleteTargetId(null);
        return;
      }

      if (key.leftArrow && mode === "right") {
        setMode("list");
        setMessage("");
        setDeleteTrackTargetId(null);
        return;
      }
    },
    { isActive: tab === "playlists" },
  );

  return (
    <Box flexDirection="column" gap={1} marginBottom={1}>
      <Box gap={3}>
        <Text bold>Playlists</Text>
        <Help items={helpList} />
      </Box>

      {message && <Text color="yellow">{message}</Text>}

      {mode === "create" && (
        <Box flexDirection="column" gap={1}>
          <Text dimColor>Create new playlist</Text>

          <Box>
            <Text>Name: </Text>
            <TextInput
              defaultValue={playlistName}
              onChange={setPlaylistName}
              onSubmit={handleCreatePlaylist}
              isDisabled={!createFocused || isLoading}
            />
          </Box>
        </Box>
      )}

      {isLoading && (
        <Box gap={2}>
          <Spinner />
          <Text>Loading playlists...</Text>
        </Box>
      )}

      {!isLoading && mode === "list" && playlists.length === 0 && (
        <Box flexDirection="column" gap={1}>
          <Text dimColor>No playlists found</Text>
          <Text dimColor>Press n to create a new playlist</Text>
        </Box>
      )}

      {!isLoading &&
        (mode === "list" || mode === "right") &&
        playlists.length > 0 && (
          <Box gap={2}>
            <Box
              width={"40%"}
              flexDirection="column"
              borderStyle="round"
              borderDimColor={!listFocused}
              minHeight={10}
            >
              <SelectInput<PlaylistWithCount>
                items={playlistItems}
                onChange={(item) => {
                  setSelectedPlaylist((prev) => {
                    if (prev?.id !== item.value.id) {
                      setDeleteTargetId(null);
                      setDeleteTrackTargetId(null);
                      setMessage("");
                    }

                    return item.value;
                  });
                }}
                onSelect={(item) => {
                  handlePlayPlaylist(item.value).catch(console.error);
                }}
                wrap={"wrap"}
                focused={listFocused}
                itemsPerPage={6}
                showNumber
                loop
              />
            </Box>

            <Box
              flexDirection="column"
              borderStyle="round"
              borderDimColor={!rightFocused}
              width={"60%"}
              paddingX={1}
            >
              {tracksLoading && (
                <Box gap={2}>
                  <Spinner />
                  <Text>Loading tracks...</Text>
                </Box>
              )}

              {!tracksLoading && activeTracks.length === 0 && (
                <Text dimColor>No tracks in this playlist</Text>
              )}

              {!tracksLoading && activeTracks.length > 0 && (
                <SelectInput<{
                  track: PlaylistTrack;
                  index: number;
                }>
                  items={trackItems}
                  onSelect={(item) => {
                    handlePlayTrack(item.value.track, item.value.index).catch(
                      console.error,
                    );
                  }}
                  onChange={(item) => {
                    setSelectedTrack((prev) => {
                      if (
                        prev?.playlistItemId !== item.value.track.playlistItemId
                      ) {
                        setDeleteTrackTargetId(null);
                        setMessage("");
                      }

                      return item.value.track;
                    });
                  }}
                  wrap={"truncate"}
                  focused={rightFocused}
                  showNumber={false}
                  itemsPerPage={6}
                  loop
                />
              )}
            </Box>
          </Box>
        )}
    </Box>
  );
}
