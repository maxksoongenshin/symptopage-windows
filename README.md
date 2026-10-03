# SymptoPage for Windows

A local symptom journal and appointment companion with English and Polish interfaces. Soft cyan surfaces, teal controls and a coral **Now / Teraz** capture button follow the Mac application's design.

## Download

Open **Actions → Windows build and tests → latest successful run → Artifacts → SymptoPage-Windows-x64**. Extract the archive, then use either:

- `SymptoPage-0.4.0-Windows-Setup.exe` — installer with destination selection.
- `SymptoPage-0.4.0-Windows-Portable.exe` — runs without installation.
- `SymptoPage-0.4.0-Windows-x64.zip` — extract the entire folder and run `SymptoPage.exe`. Keep its DLLs and resources beside the executable.

Windows 10/11, x64. The build is unsigned; a trusted publisher certificate is not configured. An artifact is available only after the Windows workflow succeeds. Do not treat the source ZIP as an installer.

## Features

- Empty first launch: no example visits or generated health readings.
- Specialist, date and visit reason, editable later.
- Calendar-day countdown; overdue visits are labelled separately.
- Now / Teraz captures the click time; select a symptom, add a note and save.
- Cancel leaves no symptom record. Editing retains its original timestamp.
- Daily None / Once / Several responses are upserted per symptom and local calendar day.
- Journal with edit/delete confirmation, English/Polish PDF and native printing.
- Language preference and records survive relaunch.

## Privacy and data

No login, analytics, remote fonts, API calls, HealthKit or Watch integration. The renderer loads only bundled files with a restrictive Content Security Policy. Electron uses sandboxing, context isolation, no Node integration in the renderer, and a narrow validated IPC API. See [Electron's context isolation guidance](https://www.electronjs.org/docs/latest/tutorial/context-isolation).

Data lives in Electron's user-data folder, `%APPDATA%/SymptoPage-Windows/records.json`. Use **Settings → Show data folder** to locate it. The portable executable also stores its data in this per-user folder; it does not store health records beside the executable. Back up the JSON file. It is not encrypted by this app. Corrupt or unsupported files are preserved and surfaced as an error; they are never silently reset. Atomic writes commit before UI success is reported. Only one instance runs at a time.

The Mac SwiftUI application remains separate. There is currently no automatic import or sync between the two formats. This version tracks one active appointment. It records personal observations and does not provide a diagnosis.

## Development

Install Node.js 24 and pnpm 11.19.0, then:

```sh
pnpm install --frozen-lockfile
pnpm start
pnpm test
pnpm test:ui
pnpm build:win
```

Build Windows installers on Windows (or use the included GitHub Actions workflow). The Electron executable is downloaded by the postinstall step. Installer targets use [electron-builder NSIS](https://www.electron.build/docs/nsis/).

`src/store.cjs` owns validated, versioned, atomic persistence. `src/main.cjs` exposes only explicit desktop actions through `src/preload.cjs`. `ui/` contains the bilingual interface and print stylesheet. `tests/` covers storage and the complete Electron user flow with a separate temporary store. No user data or generated build output is tracked by Git.
