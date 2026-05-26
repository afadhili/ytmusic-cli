import { create } from "zustand";
import type { Track } from "./types/yt-music.types.js";
import { Playlist } from "./db/schema.js";

export type Screen =
  | "home"
  | "search"
  | "history"
  | "playlists"
  | "settings"
  | "favorites";
export type Tab = "preview" | Screen;
export type QueueType = "auto" | "playlist";

type AppStore = {
  screen: Screen;
  tab: Tab;

  tracks: Track[];
  tracksType: QueueType;
  currentIndex: number;
  activePlaylist: Playlist | null;

  setActivePlaylist: (playlist: Playlist) => void;
  setTracksType: (type: QueueType) => void;
  setScreen: (screen: Screen) => void;
  setTab: (tab: Tab) => void;

  setTracks: (tracks: Track[], currentIndex?: number) => void;
  clearTracks: () => void;

  playTrackAt: (index: number) => void;
  playNextTrack: () => void;
  playPrevTrack: () => void;

  removeTrack: (index: number) => void;
  moveTrackUp: (index: number) => void;
  moveTrackDown: (index: number) => void;
};

export const useAppStore = create<AppStore>((set, get) => ({
  screen: "home",
  tab: "home",
  tracksType: "auto",

  tracks: [],
  currentIndex: -1,
  activePlaylist: null,

  setActivePlaylist: (playlist) => {
    set({ activePlaylist: playlist });
  },

  setScreen: (screen) => {
    set({ screen, tab: screen });
  },

  setTab: (tab) => {
    set({ tab });
  },

  setTracksType: (type) => {
    set({ tracksType: type });
  },

  setTracks: (tracks, currentIndex = 0) => {
    if (tracks.length === 0) {
      set({
        tracks: [],
        currentIndex: -1,
      });
      return;
    }

    const safeIndex = Math.max(0, Math.min(currentIndex, tracks.length - 1));

    set({
      tracks,
      currentIndex: safeIndex,
    });
  },

  clearTracks: () => {
    set({
      tracks: [],
      currentIndex: -1,
    });
  },

  playTrackAt: (index) => {
    const { tracks } = get();

    if (index < 0 || index >= tracks.length) return;

    set({ currentIndex: index });
  },

  playNextTrack: () => {
    const { tracks, currentIndex } = get();

    if (currentIndex < 0) return;
    if (currentIndex >= tracks.length - 1) return;

    set({ currentIndex: currentIndex + 1 });
  },

  playPrevTrack: () => {
    const { currentIndex } = get();

    if (currentIndex <= 0) return;

    set({ currentIndex: currentIndex - 1 });
  },

  removeTrack: (index) => {
    const { tracks, currentIndex } = get();

    if (index < 0 || index >= tracks.length) return;

    const newTracks = [...tracks];
    newTracks.splice(index, 1);

    if (newTracks.length === 0) {
      set({
        tracks: [],
        currentIndex: -1,
      });
      return;
    }

    let newCurrentIndex = currentIndex;

    if (index < currentIndex) {
      newCurrentIndex = currentIndex - 1;
    }

    if (index === currentIndex) {
      newCurrentIndex = Math.min(currentIndex, newTracks.length - 1);
    }

    set({
      tracks: newTracks,
      currentIndex: newCurrentIndex,
    });
  },

  moveTrackUp: (index) => {
    const { tracks, currentIndex, tracksType } = get();

    if (index <= 0 || index >= tracks.length) return;

    const newTracks = [...tracks];

    [newTracks[index - 1], newTracks[index]] = [
      newTracks[index],
      newTracks[index - 1],
    ];

    let newCurrentIndex = currentIndex;

    if (currentIndex === index) {
      newCurrentIndex = index - 1;
    } else if (currentIndex === index - 1) {
      newCurrentIndex = index;
    }

    set({
      tracks: newTracks,
      currentIndex: newCurrentIndex,
    });
  },

  moveTrackDown: (index) => {
    const { tracks, currentIndex } = get();

    if (index < 0 || index >= tracks.length - 1) return;

    const newTracks = [...tracks];

    [newTracks[index], newTracks[index + 1]] = [
      newTracks[index + 1],
      newTracks[index],
    ];

    let newCurrentIndex = currentIndex;

    if (currentIndex === index) {
      newCurrentIndex = index + 1;
    } else if (currentIndex === index + 1) {
      newCurrentIndex = index;
    }

    set({
      tracks: newTracks,
      currentIndex: newCurrentIndex,
    });
  },
}));

export default useAppStore;
