import { spawn, ChildProcess, execFileSync } from "child_process";
import net from "net";
import fs, { existsSync } from "fs";
import { loadConfig } from "../lib/config.js";
import { debugLog } from "../lib/debug-log.js";
import { validateDependencies } from "../lib/system-check.js";

type Track = {
    videoId: string;
    name: string;
    url: string;
};

let mpvProcess: ChildProcess | null = null;

export function startMpv(firstTrack?: Track) {
    const config = loadConfig();
    const SOCKET_PATH = config.socketPath;

    const { valid, missing } = validateDependencies(config.mpvBinary, config.ytdlpBinary);
    if (!valid) {
        const errorMsg = `Missing required dependencies: ${missing.join(", ")}`;
        debugLog(`FATAL ERROR: ${errorMsg}`);
        throw new Error(errorMsg);
    }

    if (fs.existsSync(SOCKET_PATH)) {
        try {
            fs.unlinkSync(SOCKET_PATH);
        } catch (err) {
            debugLog(`Warning: Could not remove old socket file: ${err}`);
        }
    }

    const args = [
        "--no-video",
        `--input-ipc-server=${SOCKET_PATH}`,
        "--idle=yes",
        "--force-window=no",
        "--player-operation-mode=pseudo-gui",
    ];

    if (config.audioOutputDevice) {
        args.push(`--audio-device=${config.audioOutputDevice}`);
    }

    if (firstTrack) {
        args.push(firstTrack.url);
    }

    try {
        mpvProcess = spawn(config.mpvBinary, args, {
            stdio: ["ignore", "pipe", "pipe"]
        });

        if (mpvProcess.stderr) {
            mpvProcess.stderr.on("data", (data) => {
                const error = data.toString().trim();
                if (error && !error.includes("Playing:")) {
                    debugLog(`MPV ERROR: ${error}`);
                }
            });
        }

        debugLog("MPV STARTED");
    } catch (err) {
        const errorMsg = `Failed to start mpv: ${err}`;
        debugLog(`FATAL ERROR: ${errorMsg}`);
        throw new Error(errorMsg);
    }

    mpvProcess.on("exit", (code, signal) => {
        debugLog(`MPV EXITED: code=${code}, signal=${signal}`);
        mpvProcess = null;

        if (fs.existsSync(SOCKET_PATH)) {
            try {
                fs.unlinkSync(SOCKET_PATH);
            } catch (err) {
                debugLog(`Warning: Could not clean up socket file: ${err}`);
            }
        }
    });

    mpvProcess.on("error", (err) => {
        debugLog(`MPV PROCESS ERROR: ${err}`);
    });
}

type MpvEvent = {
    event?: string;
    reason?: string;
};

export function waitForSocket(customTimeout?: number): Promise<void> {
    const config = loadConfig();
    const timeout = customTimeout ?? config.socketTimeout ?? 10000;
    const SOCKET_PATH = config.socketPath;

    return new Promise((resolve, reject) => {
        const startedAt = Date.now();

        const check = () => {
            try {
                if (fs.existsSync(SOCKET_PATH)) {
                    debugLog("Socket ready");
                    resolve();
                    return;
                }
            } catch (err) {
                debugLog(`Socket check error: ${err}`);
            }

            if (Date.now() - startedAt > timeout) {
                const errorMsg = `mpv socket timeout after ${timeout}ms`;
                debugLog(`ERROR: ${errorMsg}`);
                reject(new Error(errorMsg));
                return;
            }

            setTimeout(check, 100);
        };

        check();
    });
}

export function listenMpvEvents(onEvent: (event: MpvEvent) => void) {
    const SOCKET_PATH = loadConfig().socketPath;
    const client = net.createConnection(SOCKET_PATH);

    client.on("data", (chunk) => {
        const lines = chunk.toString().split("\n").filter(Boolean);

        for (const line of lines) {
            try {
                onEvent(JSON.parse(line));
            } catch (err) {
                debugLog(`Failed to parse mpv event: ${line}`);
            }
        }
    });

    client.on("error", (err) => {
        debugLog(`mpv event listener error: ${err}`);
    });

    return client;
}

export function mpvGetProperty<T = unknown>(prop: string): T | null {
    const SOCKET_PATH = loadConfig().socketPath;
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

        debugLog(`mpvGetProperty failed for '${prop}': ${parsed.error}`);
        return null;
    } catch (err) {
        debugLog(`mpvGetProperty error for '${prop}': ${err}`);
        return null;
    }
}

export function mpvCommand(command: unknown[], retries = 3): Promise<void> {
    const SOCKET_PATH = loadConfig().socketPath;

    return new Promise((resolve, reject) => {
        const attempt = (attemptsLeft: number) => {
            const client = net.createConnection(SOCKET_PATH);
            const timeout = setTimeout(() => {
                client.destroy();
                if (attemptsLeft > 1) {
                    debugLog(`mpvCommand timeout, retrying: ${JSON.stringify(command)}`);
                    attempt(attemptsLeft - 1);
                } else {
                    reject(new Error(`mpvCommand timeout: ${JSON.stringify(command)}`));
                }
            }, 1000);

            client.on("connect", () => {
                clearTimeout(timeout);
                client.write(
                    JSON.stringify({
                        command,
                    }) + "\n",
                );
                client.end();
                resolve();
            });

            client.on("error", (err) => {
                clearTimeout(timeout);
                debugLog(`mpvCommand connection error: ${err}`);
                if (attemptsLeft > 1) {
                    attempt(attemptsLeft - 1);
                } else {
                    reject(err);
                }
            });
        };

        attempt(retries);
    });
}

export async function playTrack(track: Track) {
    if (!mpvProcess) {
        startMpv(track);
        return;
    }

    try {
        await mpvCommand(["loadfile", track.url, "replace"]);
    } catch (err) {
        debugLog(`Failed to play track: ${err}`);
        throw err;
    }
}

export async function seekForward() {
    const seconds = Number(loadConfig().seekSeconds) || 5;
    await waitForSocket();
    try {
        await mpvCommand(["seek", seconds, "relative"]);
    } catch (err) {
        debugLog(`Failed to seek forward: ${err}`);
    }
}

export async function seekBackward() {
    const seconds = Number(loadConfig().seekSeconds) || 5;
    await waitForSocket();
    try {
        await mpvCommand(["seek", -seconds, "relative"]);
    } catch (err) {
        debugLog(`Failed to seek backward: ${err}`);
    }
}

export async function appendNext(track: Track) {
    try {
        await mpvCommand(["loadfile", track.url, "append-play"]);
    } catch (err) {
        debugLog(`Failed to append track: ${err}`);
    }
}

export async function skipSong() {
    try {
        await mpvCommand(["playlist-next", "force"]);
    } catch (err) {
        debugLog(`Failed to skip song: ${err}`);
    }
}

export async function prevSong() {
    try {
        await mpvCommand(["playlist-prev", "force"]);
    } catch (err) {
        debugLog(`Failed to play previous song: ${err}`);
    }
}

export async function togglePause() {
    try {
        await mpvCommand(["cycle", "pause"]);
    } catch (err) {
        debugLog(`Failed to toggle pause: ${err}`);
    }
}

export async function stopMpv() {
    debugLog("MPV STOP requested");
    try {
        await mpvCommand(["stop"]);
    } catch (err) {
        debugLog(`Failed to stop mpv: ${err}`);
    }
}
