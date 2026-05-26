type Thumbnail = {
    url: string;
    width: number;
    height: number;
};

type ThumbnailQuality = "lowest" | "medium" | "best";

export function getThumbnail(
    thumbnails: Thumbnail[],
    quality: ThumbnailQuality = "medium",
): string {
    const validThumbnails = thumbnails.filter((thumbnail) => {
        return thumbnail.url && thumbnail.width > 0 && thumbnail.height > 0;
    });

    if (validThumbnails.length === 0) return "";

    if (quality === "lowest") {
        return [...validThumbnails].sort((a, b) => {
            return a.width * a.height - b.width * b.height;
        })[0].url;
    }

    if (quality === "best") {
        return [...validThumbnails].sort((a, b) => {
            return b.width * b.height - a.width * a.height;
        })[0].url;
    }

    const targetWidth = 480;

    return [...validThumbnails].sort((a, b) => {
        return Math.abs(a.width - targetWidth) - Math.abs(b.width - targetWidth);
    })[0].url;
}

export const ASCII_CONFIG = {
    width: 26,
    brightness: 0.6,
    contrast: 1,
    invert: false,
    colored: true,
    ramp: "blocks" as const,
} as const;

export async function urlToBuffer(url: string): Promise<Buffer> {
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}