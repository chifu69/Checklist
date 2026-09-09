# Extrusion Sr. Lead Daily Checklist — v1.4

Phone-friendly PWA based on the supplied Sr. Lead Daily Checklist, with a modern printable report and an EPIC photo reader.

## Current checklist behavior
- Safety / Fork Truck / Quality / Housekeeping.
- Productivity and Blends are one section in the app and one report section.
- EXT1–EXT4 are entered one line at a time.
- Inside Air Pressure: 20–50 PSI.
- Outside Air Pressure: 3–8 PSI.
- Differential: <600 green, 600–800 yellow, >800 red.
- Equipment YES/NO colors follow the meaning of the question. For example, "Noises or any issues": NO is good/green; YES is bad/red.
- Butane and CO2 have separate lb/hr fields.
- Per-line CO2 percentage = CO2 / (Butane + CO2) × 100. Under 15% is yellow; 15% or higher is green.
- Silo #1–#5 inventory is pounds only.
- CO2 fill level and Trim Speeds were removed.
- Roll Count remains a separate app; no Roll Count completion warning appears in this report.
- Pump Room time prints in 12-hour AM/PM format.

## EPIC photo reader
There are two photo buttons for the selected line:
- Upload Photo — Control
- Upload Photo — Blend

After choosing or taking a photo, align the four blue points to the corners of the light EPIC display area. The reader perspective-corrects the screen, reads only the expected field locations, validates plausible numeric ranges, and then shows every detected value for review before anything is applied.

### Control photo fields
- Line Speed: S-Wrap Actual Speed
- Die Pressure
- Die Melt: Secondary Extruder Melt Temp
- Primary Motor Load
- Primary Screw Speed
- Secondary Motor Load
- Secondary Screw Speed
- Differential
- Butane set point
- CO2 set point

Designator, Outside Air and Inside Air remain manual because they are not shown on the supplied Line Control screen.

### Blend photo fields
Reads the Independent SP values for:
- Virgin 1
- Fluff
- Talc
- Virgin 2

Silo in Use remains manual.

### Accuracy safeguards
- Four-corner screen alignment before OCR.
- Perspective correction.
- Small field-specific OCR crops instead of relying on one full-screen text scan.
- Numeric range validation and decimal-repair fallback for values such as 112.6 or 58.3.
- Confidence labels in the review screen.
- Low-confidence readings are not selected automatically.
- Existing values are shown during review before replacement.
- If the title can be read and the EPIC extruder number differs from the selected EXT line, the app warns before applying.

The OCR engine is loaded from Tesseract.js on first use. The photo itself is processed in the browser by this app; it is not uploaded to an app server.

## Running
Serve the folder through HTTP/HTTPS. For simple PC testing inside the folder:

    python -m http.server 8080

Then open `http://localhost:8080`.

For iPhone installation, host it over HTTPS and use Add to Home Screen.
