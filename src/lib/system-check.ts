import { execSync } from "child_process";
import { debugLog } from "./debug-log.js";

export function checkBinaryExists(binary: string): boolean {
    try {
        execSync(`which ${binary}`, { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

export function validateDependencies(mpvBinary: string, ytdlpBinary: string): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!checkBinaryExists(mpvBinary)) {
        missing.push(`mpv (searched for: ${mpvBinary})`);
        debugLog(`ERROR: Required binary not found: ${mpvBinary}`);
    }

    if (!checkBinaryExists(ytdlpBinary)) {
        missing.push(`yt-dlp (searched for: ${ytdlpBinary})`);
        debugLog(`ERROR: Required binary not found: ${ytdlpBinary}`);
    }

    if (!checkBinaryExists("socat")) {
        missing.push("socat (optional but recommended for IPC)");
        debugLog("WARNING: socat not found - some features may be unavailable");
    }

    return {
        valid: missing.length === 0,
        missing,
    };
}

export function getMpvOutputDevice(): string | null {
    try {
        // List available audio outputs on the system
        const output = execSync("mpv --ao=help 2>/dev/null || echo ''", { encoding: "utf8" });
        return output.includes("alsa") ? "alsa" : null;
    } catch {
        return null;
    }
}
