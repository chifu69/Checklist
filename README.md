# Extrusion Sr. Lead Daily Checklist PWA

Phone-friendly offline checklist based on the supplied "Senior Lead Checklist (2025).docx".

## Included
- Safety / Fork Truck / Quality / Housekeeping
- Productivity for EXT1–EXT4 with automatic range highlighting
- Blends for EXT1–EXT4 and 100% total check
- Equipment Inspection with YES/NO controls
- Pump Room / Mechanical Room / Screen Packs
- Inventory, including 14-box Talc warning
- Trim Speeds / Sheet Type / Regrind
- Notes
- Roll Count is intentionally not duplicated; there is only a completion checkbox and optional link to the separate Roll Count app.
- Generate Report creates a modern printable report that follows the structure of the original Word form.
- Local autosave via browser localStorage
- Offline-capable PWA shell

## Use
For testing on a PC:
1. Unzip the folder.
2. Run a simple local web server in the folder, e.g. `python -m http.server 8080`.
3. Open `http://localhost:8080`.

For iPhone/Android install, host the folder over HTTPS, open it in the browser, then use "Add to Home Screen".

## Report
Tap **Generate Report**. The preview opens in a new tab/window. Tap **Print / Save PDF**.
