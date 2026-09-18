# Community release checklist

## Confirm before publishing

- [x] Use the MIT License and include the standard text as `LICENSE`.
- [x] Use `Copyright (c) 2026 Momoan` in the license notice.
- [x] Use `Momoan` as the public author name in `manifest.json`.
- [x] Use `momoan-todo` as the permanent public plugin ID.
- [ ] Test the plugin on Obsidian `1.6.0`, or change `minAppVersion` to the oldest version actually verified.
- [ ] Test core flows on both desktop and mobile before retaining `isDesktopOnly: false`.
- [ ] Confirm that all shipped code and assets may be published under the selected license.

## Repository and release

- [ ] Create a public GitHub repository, preferably named `momoan-todo`.
- [ ] Commit `README.md`, `LICENSE`, `manifest.json`, `main.js`, and `styles.css` at the repository root.
- [x] Replace the temporary `0.9.56` build files with the actual verified `0.9.58` ZIP contents.
- [ ] Create a GitHub release with tag `0.9.58`, exactly matching `manifest.json`.
- [ ] Attach `main.js`, `manifest.json`, and `styles.css` individually to the release. The ZIP is optional and does not replace these assets.
- [ ] Sign in at `community.obsidian.md`, connect GitHub, and add the repository under **Plugins -> New plugin**.
- [ ] Review and resolve automated scanner feedback. Any follow-up release must use a higher semantic version.

## Verified in this preparation

- `manifest.json` uses a valid lowercase/hyphen ID.
- The public display name uses Basic Latin characters.
- The description is under 250 characters, contains no emoji, and ends with a period.
- Static inspection found no Node.js or Electron imports and no network requests.
- `main.js` passes `node --check`.
- The package contains no third-party plugin files.
