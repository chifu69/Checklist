# Extrusion Sr. Lead Daily Checklist PWA — v1.1

Phone-friendly offline checklist based on the supplied Senior Lead Checklist.

## v1.1 changes
- Productivity and Blends are now one phone section and one dedicated report sheet.
- Butane and CO₂ have separate lb/hr fields for each extrusion line.
- Automatic CO₂ daily summary:
  - active line = Butane field contains a value (CO₂ may explicitly be 0)
  - Total Butane
  - Total CO₂
  - Average CO₂ lb/hr per active line
  - Total CO₂ Mix % = Total CO₂ / (Total Butane + Total CO₂) × 100
  - CO₂ Mix <15% = yellow; ≥15% = green
  - if an active line has blank CO₂, summary is marked incomplete rather than assuming blank = 0
- Inside Air Pressure target changed to 20–50 PSI.
- Differential status changed to <600 green, 600–800 yellow, >800 red.
- Equipment YES/NO colors now follow the meaning of each question:
  - positive checks: YES green / NO red
  - problem questions (noise/issues, cam bolt issues, die head issues): NO green / YES red
- Silo #1–#5 remain pounds only.
- Generated report includes a modern silo illustration for all five silos with the entered pounds.
- Roll Count remains separate and is not duplicated.

## Use
Serve this folder from HTTPS (recommended for iPhone/Android PWA install) or a local web server for testing.

Example local test:
`python -m http.server 8080`

Then open `http://localhost:8080`.

## Report
Tap **Generate Report** and then **Print / Save PDF**.
