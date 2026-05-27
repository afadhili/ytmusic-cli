import { Box, useApp, useInput } from "ink";
import Help, { HelpItems } from "../components/help.js";
import SelectInput from "../components/select-input.js";
import useAppStore, { Screen } from "../app.store.js";
import { quit } from "../lib/enter-screen.js";

export default function Home() {
  const { setScreen, tab } = useAppStore();

  useInput((input, key) => {
    if (input === "q") quit();
  });

  const helpList: HelpItems = [
    ["󰌑", "Select"],
    ["q", "Quit"],
  ];

  const items = [
    {
      label: " Search Music",
      value: "search",
    },
    {
      label: "󰲹 Playlists",
      value: "playlists",
    },
    {
      label: " Favorites",
      value: "favorites",
    },
    {
      label: " History",
      value: "history",
    },
    {
      label: " Settings",
      value: "settings",
    },
    {
      label: "󰩈 Quit",
      value: "quit",
    },
  ];

  return (
    <Box flexDirection="column">
      <Box>
        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === "quit") quit();

            setScreen(item.value as Screen);
          }}
          focused={tab === "home"}
        />
      </Box>
      <Help items={helpList} marginTop={1} />
    </Box>
  );
}
