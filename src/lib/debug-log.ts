import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

const DEBUG_LOG_PATH = path.join(homedir(), ".config", "ytmusic-cli", "debug.log");

export function debugLog(...args: unknown[]) {
    fs.appendFileSync(
        DEBUG_LOG_PATH,
        args.map(String).join(" ") + "\n",
    );
}

export function clearLog() {
    fs.writeFileSync(DEBUG_LOG_PATH, "")
}