import { Box, useApp, useInput } from "ink";
import Help, { HelpItems } from "../components/help.js";
import SelectInput from "../components/select-input.js";
import useAppStore, { Screen } from "../app.store.js";
import { quit } from "../lib/enter-screen.js";

export default function Home() {
  const { setScreen, tab } = useAppStore();
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === "q") exit();
  });

  const helpList: HelpItems = [["󰌑", "Select"]];

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
  ];

  return (
    <Box flexDirection="column">
      <Box>
        <SelectInput
          items={items}
          onSelect={(item) => {
            setScreen(item.value as Screen);
          }}
          focused={tab === "home"}
        />
      </Box>
      <Help items={helpList} marginTop={1} />
    </Box>
  );
}
