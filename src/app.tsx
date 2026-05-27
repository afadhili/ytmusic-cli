#!/usr/bin/env node
import { useEffect } from "react";
import { render, Box, Text, useInput } from "ink";
import useAppStore from "./app.store.js";
import Home from "./screens/home.js";
import Search from "./screens/search.js";
import { Settings } from "./screens/settings.js";
import { listenMpvEvents, startMpv, waitForSocket } from "./services/mpv.js";
import { enterFullscreen, quit } from "./lib/enter-screen.js";
import { clearLog, debugLog } from "./lib/debug-log.js";
import PlayingTrack from "./components/playing-track.js";
import { playNext } from "./services/yt-music.js";
import History from "./screens/history.js";
import Playlists from "./screens/playlists.js";
import { ensureDbMigrated } from "./db/index.js";
import Favorites from "./screens/favorites.js";
import { loadConfig } from "./lib/config.js";
import { validateDependencies } from "./lib/system-check.js";

const App = () => {
  const { screen, tab, setTab, setScreen, tracks } = useAppStore();

  useInput((input, key) => {
    if (key.tab) {
      if (tab === "preview") setTab(screen);
      else if (tracks && tracks.length > 0) setTab("preview");
    }
  });

  useEffect(() => {
    try {
      startMpv();
    } catch (err) {
      console.error("Failed to start MPV:", err);
      debugLog(`FATAL: ${err}`);
      return;
    }

    waitForSocket()
      .then(() => {
        listenMpvEvents(async (event) => {
          if (event.event !== "end-file") return;

          if (event.reason === "eof") {
            debugLog("Track finished normally");
            await playNext();
            return;
          }

          if (event.reason === "stop") {
            debugLog("Track manually stopped");
            return;
          }

          if (event.reason === "quit") {
            debugLog("mpv quit");
            return;
          }

          if (event.reason === "error") {
            debugLog("Track playback error");
          }
        });
      })
      .catch((err) => {
        debugLog(`Socket connection failed: ${err}`);
      });
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Box
        alignSelf="center"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
      >
        <Text bold color="cyan">
          YT Music CLI
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {screen === "home" && <Home />}
        {screen === "search" && <Search />}
        {screen === "playlists" && <Playlists />}
        {screen === "history" && <History />}
        {screen === "favorites" && <Favorites />}
        {screen === "settings" && <Settings onBack={() => setScreen("home")} />}

        <PlayingTrack />
      </Box>
    </Box>
  );
};

clearLog();
ensureDbMigrated();

// Validate dependencies before starting the app
const config = loadConfig();
const { valid, missing } = validateDependencies(
  config.mpvBinary,
  config.ytdlpBinary,
);

if (!valid) {
  console.error("ERROR: Missing required dependencies:");
  missing.forEach((dep) => console.error(`  - ${dep}`));
  console.error("\nPlease install the missing dependencies and try again.");
  process.exit(1);
}

enterFullscreen();

render(<App />);

process.on("exit", quit);
process.on("SIGINT", quit);
process.on("SIGTERM", quit);
