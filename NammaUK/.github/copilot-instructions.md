<!-- Copilot / AI agent guidance for the NammaUK static site -->
# Copilot instructions — NammaUK

Purpose: Help AI coding agents be immediately productive editing this small static site.

- Project type: Plain static website (HTML/CSS/JS) with data-driven rendering from JSON files.
- Deploys as static site (see [README.md](README.md)). No build system or bundler is used.

Key files and data flows
- [index.html](index.html): main entry and navigation.
- HTML pages: static pages per place (e.g. [ankola.html](ankola.html), [karwar.html](karwar.html)).
- Data: [data/places.json](data/places.json) drives place lists; [data/images.json](data/images.json) maps images; [data/uk_boundary.json](data/uk_boundary.json) used for map/geo overlays.
- Assets: images under `assets/images/`, icons under `assets/icons/`.
- JS: interactive logic lives in `js/`:
  - [js/places-renderer.js](js/places-renderer.js): renders places from `data/places.json` into pages and lists — primary integration point for data → DOM.
  - [js/main.js](js/main.js): site initialization and event wiring.
  - [js/dev.js](js/dev.js): small dev helpers (safe to run locally).
  - [js/translations.js](js/translations.js): translation strings used by pages.

Common change patterns (explicit examples)
- Add or update a place: edit [data/places.json](data/places.json); add images to `assets/images/` and metadata to [data/images.json](data/images.json); UI will pick up changes via `js/places-renderer.js`.
- Add a static page: copy an existing place HTML (e.g. [ankola.html](ankola.html)) and update content; ensure any new images are included under `assets/images/` and referenced in `data/images.json` if needed.
- Map or geo changes: update [data/uk_boundary.json](data/uk_boundary.json) and adjust map logic in `js/places-renderer.js` or `js/main.js`.

Developer workflow (how to preview and test changes)
- No build step. Preview locally with a static HTTP server. Examples:

  - Python: `python -m http.server 8000` (from repo root)
  - Node: `npx http-server -p 8000`

- Use the VS Code Live Server extension for quick reloads while editing.
- Debugging: open DevTools, check console for errors, inspect DOM elements the renderer updates (see `places-renderer.js`).

Conventions and constraints
- Keep edits minimal and non-invasive: this repo expects plain script files (no ES module bundling); prefer direct DOM updates already used in `js/*.js`.
- Maintain data-first approach: prefer changing `data/*.json` over hardcoding lists in HTML.
- File locations matter: images referenced in JSON must exist under `assets/images/`.

Code style hints
- Small helper functions live inside `js/*.js`. Follow existing imperative style (no TypeScript, no build tooling).
- Use relative paths consistent with other files (e.g., `assets/images/foo.jpg`).

Pull request guidance
- Keep PRs scoped (one place or small UI fix per PR).
- Example commit message: `places: add <PlaceName> + images` or `fix(renderer): correct image path for <place>`.

If you can't determine intent from data/HTML/JS alone
- Run the local server and open [index.html](index.html) to observe behavior.
- Inspect `js/places-renderer.js` to see how JSON keys map to rendered fields.

Notes for future agents
- There is no test suite — validate changes visually in the browser.
- If adding automation or build tooling, document it clearly in [README.md](README.md) and update this file.

---
If any section is unclear or you want more examples (e.g., a patch that adds a new place end-to-end), tell me which area to expand.
