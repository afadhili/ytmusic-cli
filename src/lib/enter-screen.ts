import { stopMpv } from "../services/mpv.js";

export function enterFullscreen(): void {
    process.stdout.write("\x1b[?1049h");
    process.stdout.write("\x1b[2J");
    process.stdout.write("\x1b[H");
}

export function quit(): void {
    exitFullscreen();
    stopMpv().then(() => process.exit());
}

export function exitFullscreen(): void {
    process.stdout.write("\x1b[?1049l");
}