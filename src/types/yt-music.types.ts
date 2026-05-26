export type Track = {
    type: "SONG";
    name: string;
    videoId: string;
    artist: string;
    duration: number | null;
    thumbnails: string;
}

export type SongDetails = {
    type: "SONG";
    name: string;
    videoId: string;
    artist: {
        artistId: string | null;
        name: string;
    };
    album: {
        name: string;
        albumId: string;
    } | null;
    duration: number | null;
    thumbnails: {
        url: string;
        width: number;
        height: number;
    }[];
}

export type UpNextRuntime = {
    type: "SONG";
    videoId: string;
    duration: string;
    thumbnail: string;
    title: string;
    artists: string;
}
