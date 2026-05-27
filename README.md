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

This app require mpv & yt-dlp to use every feature it has, if you don't have yt-dlp you can still use it, but u wouldn't be able to download music

- [mpv](https://mpv.io/) - Media player for audio playback
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube audio extraction

### Installing Requirements

<details>
<summary><b>Windows</b></summary>

```bash
# With Scoop
scoop install mpv yt-dlp

# With Chocolatey
choco install mpv yt-dlp
```

</details>

<details>
<summary><b>macOS</b></summary>

```bash
brew install mpv yt-dlp
```

</details>

<details>
<summary><b>Linux</b></summary>

```bash
# Ubuntu/Debian
sudo apt install mpv
pip install yt-dlp

# Arch Linux
sudo pacman -S mpv yt-dlp

# Fedora
sudo dnf install mpv yt-dlp
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
