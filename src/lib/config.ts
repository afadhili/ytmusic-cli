import fs from "fs";
import path from "path";
import os, { homedir } from "os";
import { fileURLToPath } from "url";

export type PlayerConfig = {
    socketPath: string;
    cacheDir: string;
    dbLocation: string;
    migrationDir: string;

    mpvBinary: string;
    ytdlpBinary: string;

    audioFormat: "opus" | "mp3" | "m4a" | "flac";
    audioFormatFallback: ("opus" | "mp3" | "m4a" | "flac")[];

    customCookiesPath: string,
    seekSeconds: number,
    downloadOnPlay: boolean;
    audioOutputDevice?: string;
    socketTimeout?: number;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, "../..");
export const DATA_DIR = path.join(os.homedir(), ".local", "share", "ytmusic-cli");

export const DEFAULT_CONFIG: PlayerConfig = {
    cacheDir: path.join(os.homedir(), "Music", "ytmusic-cli"),
    migrationDir: path.join(PROJECT_ROOT, "migrations"),
    dbLocation: path.join(DATA_DIR, ".database.db"),

    customCookiesPath: "",
    socketPath: path.join(DATA_DIR, "ytmusic-mpv-socket"),
    mpvBinary: "mpv",
    ytdlpBinary: "yt-dlp",
    audioFormat: "opus",
    audioFormatFallback: ["mp3", "m4a", "flac"],
    seekSeconds: 5,
    downloadOnPlay: true,
    audioOutputDevice: undefined,
    socketTimeout: 10000,
};

export const CONFIG_DIR = path.join(os.homedir(), ".config", "ytmusic-cli");
export const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export function loadConfig(): PlayerConfig {
    let config: PlayerConfig;

    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    if (!fs.existsSync(CONFIG_PATH)) {
        config = DEFAULT_CONFIG;
    } else {
        try {
            const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
            const parsed = JSON.parse(raw) as Partial<PlayerConfig>;

            config = {
                ...DEFAULT_CONFIG,
                ...parsed,
            };
        } catch {
            config = DEFAULT_CONFIG;
        }
    }

    return config;
}

export function saveConfig(config: PlayerConfig) {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function expandPath(p: string): string {
    return p.replace(/^~/, homedir());
}

export function resetConfig() {
    saveConfig(DEFAULT_CONFIG);
}
