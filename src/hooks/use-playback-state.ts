import { useEffect, useRef, useState } from "react";
import { existsSync } from "node:fs";
import { mpvGetProperty } from "../services/mpv.js";
import { loadConfig } from "../lib/config.js";

const SOCKET_PATH = loadConfig().socketPath;

export function usePlaybackState(intervalMs = 1000) {
    const [state, setState] = useState({ position: 0, duration: 0, paused: false });
    const readyRef = useRef(false);

    useEffect(() => {
        readyRef.current = false;
        setState({ position: 0, duration: 0, paused: false });

        const tick = async () => {
            if (!readyRef.current) {
                if (!existsSync(SOCKET_PATH)) return;
                readyRef.current = true;
            }

            const [pos, dur, paused] = await Promise.all([
                mpvGetProperty<number>("time-pos"),
                mpvGetProperty<number>("duration"),
                mpvGetProperty<boolean>("pause"),
            ]);

            if (pos == null || dur == null || paused == null) return;
            setState({ position: pos, duration: dur, paused });
        };

        const id = setInterval(tick, intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);

    return state;
}