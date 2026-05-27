import { useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import {
  DEFAULT_CONFIG,
  loadConfig,
  PlayerConfig,
  saveConfig,
} from "../lib/config.js";
import SelectInput from "../components/select-input.js";
import { TextInput } from "@inkjs/ui";
import Help from "../components/help.js";

type SettingKey = keyof PlayerConfig;

type SettingItem = {
  label: string;
  key: SettingKey | "save" | "reset" | "back";
  type?: "text" | "number" | "boolean" | "select";
  options?: string[];
  description?: string;
};

const SETTINGS: SettingItem[] = [
  {
    label: "󰆓 Save settings",
    key: "save",
  },
  {
    label: "󰑓 Reset to default",
    key: "reset",
  },
  {
    label: "󰝚 MPV binary",
    key: "mpvBinary",
    type: "text",
  },
  {
    label: "󰇚 yt-dlp binary",
    key: "ytdlpBinary",
    type: "text",
  },
  {
    label: "󰉋 Cache directory",
    key: "cacheDir",
    type: "text",
  },
  {
    label: "󰎆 Audio format",
    key: "audioFormat",
    type: "select",
    options: ["opus", "mp3", "m4a", "flac"],
  },
  {
    label: "󰥔 Seek seconds",
    key: "seekSeconds",
    type: "number",
  },
  {
    label: "󰇚 Download on play",
    key: "downloadOnPlay",
    type: "boolean",
  },
  {
    label: "󱛔 Custom cookies path",
    key: "customCookiesPath",
    type: "text",
    description:
      "Path to your custom cookies, eg: ~/.config/ytmusic-cli/cookies.txt, needs to have `name=value;` format",
  },
];

function formatValue(
  config: PlayerConfig,
  key: SettingKey | "save" | "reset" | "back",
) {
  if (key === "save" || key === "reset" || key === "back") return "";

  const value = config[key];

  if (typeof value === "boolean") {
    return value ? "enabled" : "disabled";
  }

  return String(value);
}

type Props = {
  onBack?: () => void;
};

export function Settings({ onBack }: Props) {
  const { exit } = useApp();

  const [config, setConfig] = useState<PlayerConfig>(() => loadConfig());
  const [selectedSetting, setSelectedSetting] = useState<SettingItem | null>(
    null,
  );
  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState("");

  const items = useMemo(() => {
    return SETTINGS.map((setting) => {
      const value = formatValue(config, setting.key);

      return {
        label: value ? `${setting.label}: ${value}` : setting.label,
        value: setting.key,
      };
    });
  }, [config]);

  useInput((input, key) => {
    if (selectedSetting) {
      if (key.escape) {
        setSelectedSetting(null);
      }

      return;
    }

    if (input === "q" || key.escape) {
      if (onBack) onBack();
      else exit();
    }
  });

  function updateConfig<K extends keyof PlayerConfig>(
    key: K,
    value: PlayerConfig[K],
  ) {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));

    setMessage("");
  }

  function handleSelect(item: { label: string; value: string }) {
    const setting = SETTINGS.find((entry) => entry.key === item.value);
    if (!setting) return;

    if (setting.key === "save") {
      saveConfig(config);
      setMessage("Settings saved.");
      return;
    }

    if (setting.key === "reset") {
      setConfig(DEFAULT_CONFIG);
      saveConfig(DEFAULT_CONFIG);
      setMessage("Settings reset to default.");
      return;
    }

    if (setting.key === "back") {
      if (onBack) onBack();
      else exit();
      return;
    }

    if (setting.type === "boolean") {
      updateConfig(setting.key, !config[setting.key] as never);
      return;
    }

    if (setting.type === "select") {
      setSelectedSetting(setting);
      return;
    }

    setSelectedSetting(setting);
    setInputValue(String(config[setting.key]));
  }

  function submitTextValue(value: string) {
    if (!selectedSetting) return;
    if (
      selectedSetting.key === "save" ||
      selectedSetting.key === "reset" ||
      selectedSetting.key === "back"
    ) {
      return;
    }

    if (selectedSetting.type === "number") {
      const parsed = Number(value);

      if (!Number.isFinite(parsed) || parsed < 0) {
        setMessage("Invalid number.");
        return;
      }

      updateConfig(selectedSetting.key, parsed as never);
    } else {
      updateConfig(selectedSetting.key, value as never);
    }

    setSelectedSetting(null);
    setInputValue("");
  }

  function submitSelectValue(item: { label: string; value: string }) {
    if (!selectedSetting) return;
    if (
      selectedSetting.key === "save" ||
      selectedSetting.key === "reset" ||
      selectedSetting.key === "back"
    ) {
      return;
    }

    updateConfig(selectedSetting.key, item.value as never);
    setSelectedSetting(null);
  }

  if (selectedSetting?.type === "select") {
    return (
      <Box flexDirection="column">
        <Text bold>Set {selectedSetting.label}</Text>
        <Text dimColor>Esc to cancel</Text>

        <Box marginTop={1}>
          <SelectInput
            items={(selectedSetting.options ?? []).map((option) => ({
              label: option,
              value: option,
            }))}
            onSelect={submitSelectValue}
          />
        </Box>
      </Box>
    );
  }

  if (selectedSetting) {
    return (
      <Box flexDirection="column">
        <Text bold>Set {selectedSetting.label}</Text>
        {selectedSetting.description && (
          <Text dimColor>{selectedSetting.description}</Text>
        )}
        <Box marginTop={1}>
          <Text dimColor>
            Current value:{" "}
            {String(config[selectedSetting.key as keyof PlayerConfig])}
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text>{"> "}</Text>
          <TextInput
            defaultValue={inputValue}
            onChange={setInputValue}
            onSubmit={submitTextValue}
          />
        </Box>

        {message && (
          <Box marginTop={1}>
            <Text color="yellow">{message}</Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Settings</Text>

      <Box>
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>

      {message && (
        <Box>
          <Text color="green">{message}</Text>
        </Box>
      )}

      <Help
        items={[
          ["󰌑", "Edit"],
          ["q", "Back"],
        ]}
      />
    </Box>
  );
}
