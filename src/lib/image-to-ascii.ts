import { existsSync } from "node:fs";
import sharp from "sharp";

const RAMPS = {
  standard: ".,;:clodxOXNW@",
  blocks: "░▒▓█",
  detailed: "`.-':_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@",
  simple: ".:-=+*#%@",
  solid: "█",
} as const;

type RampName = keyof typeof RAMPS;

export type ImageToAsciiOptions = {
  width?: number;
  brightness?: number;
  contrast?: number;
  invert?: boolean;
  colored?: boolean;
  ramp?: RampName;
  bgColor?: boolean;
  saturation?: number;
};

// ─── ANSI helpers ────────────────────────────────────────────────────────────

function fgTrueColor(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

function bgTrueColor(r: number, g: number, b: number): string {
  return `\x1b[48;2;${r};${g};${b}m`;
}

const RESET = "\x1b[0m";

function clamp(v: number, lo = 0, hi = 255): number {
  return Math.min(hi, Math.max(lo, v));
}

function applyAdjustments(
  value: number,
  brightness: number,
  contrast: number,
  invert: boolean,
): number {
  let v = (value - 128) * contrast + 128 + brightness;
  v = clamp(v);
  return invert ? 255 - v : v;
}

function boostSaturation(r: number, g: number, b: number, factor: number): [number, number, number] {
  if (factor === 1) return [r, g, b];
  const avg = (r + g + b) / 3;
  return [
    clamp(avg + (r - avg) * factor),
    clamp(avg + (g - avg) * factor),
    clamp(avg + (b - avg) * factor),
  ];
}

function convertToSymbol(gray: number, symbols: string): string {
  const idx = Math.floor((gray / 255) * (symbols.length - 1));
  return symbols[idx] ?? " ";
}

export async function imageToAscii(
  input: string | Buffer,
  options: ImageToAsciiOptions = {},
): Promise<string> {
  const width = options.width ?? 40;
  const brightness = options.brightness ?? 0;
  const contrast = options.contrast ?? 1;
  const invert = options.invert ?? false;
  const colored = options.colored ?? true;
  const bgColor = options.bgColor ?? false;
  const saturation = options.saturation ?? 1;
  const symbols = RAMPS[options.ramp ?? "standard"];

  const metadata = await sharp(input).metadata();
  const origW = metadata.width ?? width;
  const origH = metadata.height ?? width;
  const aspectRatio = origH / origW;
  const height = Math.max(1, Math.round(width * aspectRatio * 0.4));

  const { data, info } = await sharp(input)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .modulate({ saturation: 2 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = info.channels;
  const lines: string[] = [];

  for (let y = 0; y < info.height; y++) {
    let line = "";

    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * ch;

      const rawR = data[i] ?? 0;
      const rawG = data[i + 1] ?? 0;
      const rawB = data[i + 2] ?? 0;
      const alpha = data[i + 3] ?? 255;

      if (alpha <= 64) {
        line += " ";
        continue;
      }

      const [r, g, b] = boostSaturation(rawR, rawG, rawB, saturation);

      const rawGray = 0.299 * rawR + 0.587 * rawG + 0.114 * rawB;
      const gray = applyAdjustments(rawGray, brightness, contrast, invert);
      const char = convertToSymbol(gray, symbols);

      if (!colored) {
        line += char.trim() ? char : " ";
        continue;
      }

      if (bgColor) {
        line += bgTrueColor(r, g, b) + " " + RESET;
      } else {
        const printChar = char.trim() ? char : " ";
        line += fgTrueColor(r, g, b) + printChar + RESET;
      }
    }

    lines.push(line);
  }

  return lines.join("\n");
}