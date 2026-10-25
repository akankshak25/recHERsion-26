# SafeSphere AI — Personal & Digital Safety Companion

**Tagline:** Your safety. Your privacy. Your control.

## Included files
- `index.html` — App structure and four main tabs.
- `style.css` — Responsive dark theme and UI styles.
- `app.js` — GPS, SOS demo, emergency dial/SMS handoff, siren, camera capture, rule-based message scanning, local incident records, settings, and JSON export.
- `README.md` — Setup and important limitations.

## Run locally
1. Extract `SafeSphere_AI_App.zip`.
2. Open the extracted folder.
3. For basic UI features, open `index.html` in a modern browser.
4. For GPS and camera features, use a secure context such as `http://localhost` or HTTPS. A simple local server can be started from this folder with Python:
   - Windows: `py -m http.server 8000`
   - macOS/Linux: `python3 -m http.server 8000`
   Then visit `http://localhost:8000`.

## Important safety and privacy notes
- This is a front-end demonstration, not a verified emergency dispatch system. Pressing SOS logs an incident locally; it does **not** automatically notify police, emergency services, or contacts.
- The SMS button opens a pre-filled draft and requires the user to send it.
- ThreatLens is a simple keyword/rule-based classifier, not a real AI model. It can miss threats or flag harmless text.
- Records and captured images are stored in browser `localStorage`, which is **not encrypted**. Do not use this as a secure evidence vault on a shared device.
- Camera use requires permission and may require HTTPS or localhost.
- Helpline availability can vary. In India, 112 is the national emergency number. If in immediate danger, call emergency services directly rather than relying on this demo.
