# Validation — 2026-10-03

- Six Node storage tests passed locally: empty startup, persistence, language retention, daily-answer upsert, timestamp-preserving edits, visit associations, deletion, invalid input rejection, corrupt-file preservation and failed-write rollback.
- Renderer manually exercised in a local development preview backed by the real Store class and a disposable temporary file: onboarding, 47-day countdown for 19 November, first/repeated Now, cancel after symptom selection without saving, save with note, daily answer, English/Polish switch, journal editing and persistence after reload.
- The preview's PDF and print methods are stubs; they were not counted as desktop PDF/print validation.
- Windows x64 directory/ZIP packaging uses the official Electron runtime. There is no Windows host attached to this workspace, so actual execution of the Windows EXE is not yet verified.
- The automated Electron UI flow is included for Windows CI. Launching Electron through the local sandboxed macOS test process aborted with SIGABRT before a window opened; the test is not reported as passed locally.
- NSIS installer packaging on this Mac failed in makensis. The Windows workflow builds NSIS, portable EXE and ZIP after tests pass; no successful CI run is claimed before publication.
- Binaries are unsigned. Public release signing, automatic updates, Windows accessibility audit and physical printing remain unverified.

The Mac SwiftUI application and its existing data have not been modified by this port.

## Windows CI — confirmed

[Run 37138724818](https://github.com/maxksoongenshin/symptopage-windows/actions/runs/37138724818), commit `87f8cab674cf8a254dbe7e58668bb979b46ae4cb`, completed successfully on Windows in 3m 16s. Dependency installation, all storage tests, the full Electron UI test (including PDF generation and restart), NSIS installer, portable EXE, ZIP packaging and artifact upload passed. The local Mac limitations above are retained as an audit trail; they do not describe the Windows CI outcome.
