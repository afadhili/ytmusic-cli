import { spawn, ChildProcess, execFileSync } from "child_process";
import net from "net";
import fs, { existsSync } from "fs";
import { loadConfig } from "../lib/config.js";
import { debugLog } from "../lib/debug-log.js";

type Track = {
    videoId: string;
    name: string;
    url: string;
};

let mpvProcess: ChildProcess | null = null;

export function startMpv(firstTrack?: Track) {
    const SOCKET_PATH = loadConfig().socketPath
    if (fs.existsSync(SOCKET_PATH)) {
        fs.unlinkSync(SOCKET_PATH);
    }

    mpvProcess = spawn(
        "mpv",
        [
            "--no-video",
            `--input-ipc-server=${SOCKET_PATH}`,
            "--idle=yes",
            "--force-window=no",
            "--player-operation-mode=pseudo-gui",
            firstTrack ? firstTrack.url : "",
        ],
        {
            stdio: "ignore",
        },
    );

    debugLog("MPV STARTED")

    mpvProcess.on("exit", () => {
        mpvProcess = null;

        if (fs.existsSync(SOCKET_PATH)) {
            fs.unlinkSync(SOCKET_PATH);
        }
    });
}

type MpvEvent = {
    event?: string;
    reason?: string;
};

export function waitForSocket(timeout = 10000): Promise<void> {
    const SOCKET_PATH = loadConfig().socketPath
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();

        const check = () => {
            if (fs.existsSync(SOCKET_PATH)) {
                resolve();
                return;
            }

            if (Date.now() - startedAt > timeout) {
                reject(new Error("mpv socket timeout"));
                return;
            }

            setTimeout(check, 50);
        };

        check();
    });
}

export function listenMpvEvents(onEvent: (event: MpvEvent) => void) {
    const SOCKET_PATH = loadConfig().socketPath
    const client = net.createConnection(SOCKET_PATH);

    client.on("data", (chunk) => {
        const lines = chunk.toString().split("\n").filter(Boolean);

        for (const line of lines) {
            try {
                onEvent(JSON.parse(line));
            } catch {
                // ignore invalid json
            }
        }
    });

    client.on("error", console.error);

    return client;
}

export function mpvGetProperty<T = unknown>(prop: string): T | null {
    const SOCKET_PATH = loadConfig().socketPath
    if (!existsSync(SOCKET_PATH)) return null;

    try {
        const json = JSON.stringify({
            command: ["get_property", prop],
        });

        const result = execFileSync(
            "sh",
            [
                "-c",
                `printf '%s\n' '${json}' | socat - UNIX-CONNECT:${SOCKET_PATH} 2>/dev/null`,
            ],
            {
                encoding: "utf8",
                timeout: 500,
            },
        );

        const parsed = JSON.parse(result.trim());

        if (parsed.error === "success") {
            return parsed.data as T;
        }

        return null;
    } catch {
        return null;
    }
}

export function mpvCommand(command: unknown[]): Promise<void> {
    const SOCKET_PATH = loadConfig().socketPath
    return new Promise((resolve, reject) => {
        const client = net.createConnection(SOCKET_PATH);

        client.on("connect", () => {
            client.write(
                JSON.stringify({
                    command,
                }) + "\n",
            );

            client.end();
            resolve();
        });

        client.on("error", reject);
    });
}

export async function playTrack(track: Track) {
    if (!mpvProcess) {
        startMpv(track);
        return;
    }

    await mpvCommand(["loadfile", track.url, "replace"]);
}

export async function seekForward() {
    const seconds = Number(loadConfig().seekSeconds) || 5;
    await waitForSocket();
    await mpvCommand(["seek", seconds, "relative"]);
}

export async function seekBackward() {
    const seconds = Number(loadConfig().seekSeconds) || 5;
    await waitForSocket();
    await mpvCommand(["seek", -seconds, "relative"]);
}

export async function appendNext(track: Track) {
    await mpvCommand(["loadfile", track.url, "append-play"]);
}

export async function skipSong() {
    await mpvCommand(["playlist-next", "force"]);
}

export async function prevSong() {
    await mpvCommand(["playlist-prev", "force"]);
}

export async function togglePause() {
    await mpvCommand(["cycle", "pause"]);
}

export async function stopMpv() {
    debugLog("MPV STOPPED")
    await mpvCommand(["stop"]);
}
