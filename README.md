# YT Music CLI

Terminal-based YouTube Music player built with Ink, mpv, yt-dlp, SQLite, and Drizzle ORM.

## Features

- Search and play YouTube Music tracks
- Queue with next, previous, remove, and reorder support
- History, favorites, and playlists
- Lyrics support
- ASCII album cover preview
- Local audio cache
- Configurable settings
- mpv IPC control

## Screenshots

### Home

![Home Preview](./screenshots/home-page.png)

### Search

![Search Page](./screenshots/search.png)

### Playlists

![Playlists Page](./screenshots/playlist-page.png)

## Requirements

This app requires mpv, yt-dlp, and socat to use all features. You can still run without yt-dlp (stream-only mode) or socat (limited IPC features), but mpv is essential.

- [mpv](https://mpv.io/) - Media player for audio playback (required)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube audio extraction (recommended)
  - **Why:** Enables local caching of tracks, better offline support, and fallback audio format support when streaming fails
- [socat](http://www.dest-unreach.org/socat/) - Socket communication utility (recommended)
  - **Why:** Required for reliable mpv IPC communication, property queries, and advanced error diagnostics

### Installing Requirements

<details>
<summary><b>Windows</b></summary>

```bash
# With Scoop
scoop install mpv yt-dlp socat

# With Chocolatey
choco install mpv yt-dlp socat
```

</details>

<details>
<summary><b>macOS</b></summary>

```bash
brew install mpv yt-dlp socat
```

</details>

<details>
<summary><b>Linux</b></summary>

```bash
# Ubuntu/Debian
sudo apt install mpv socat
pip install yt-dlp

# Arch Linux (btw)
sudo pacman -S mpv yt-dlp socat

# Fedora
sudo dnf install mpv yt-dlp socat
```

</details>

## Installation

Install from npm:

```bash
npm install -g @afadhili/ytmusic-cli
```

Run:

```bash
ytmusic-cli
```

## Development

Clone the repository:

```bash
git clone https://github.com/afadhili/ytmusic-cli.git
cd ytmusic-cli
```

Install dependencies:

```bash
npm install
```

Run in development mode:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Run built version:

```bash
npm start
```

## Notes

This app uses `mpv` for playback and `yt-dlp` for downloading/caching tracks.
