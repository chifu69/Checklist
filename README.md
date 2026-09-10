# Extrusion Sr. Lead Daily Checklist — v1.8

Phone-friendly PWA based on the supplied Sr. Lead Daily Checklist.

## v1.8 changes
- Attention banner now lists each actual problem instead of only showing a count.
- Talc below 14 boxes is shown in red in the app and report.
- CO₂ inventory is treated as volume: the report shows the value only, with no lb/lbs unit.
- Silo colors:
  - More than 100,000 lb = green
  - 50,000–100,000 lb = yellow
  - Less than 50,000 lb = red
- The silo drawings and silo values use those colors in the generated report.
- Added **Share Report** to the report toolbar.
  - On supported iPhone/iPad browsers it creates a PDF and opens the native iOS share sheet so it can be sent with Mail, Messages, AirDrop, Files, etc.
  - If file sharing is unavailable, the app saves the generated PDF as a fallback.
- EPIC photo/live scanning remains removed for now.
- The generated-from-PWA footer remains removed.

## Existing process rules
- Outside Air: 3–8 PSI
- Inside Air: 20–50 PSI
- Differential: under 600 green, 600–800 yellow, above 800 red
- CO₂ % is calculated per active line from CO₂ / (Butane + CO₂)
- CO₂ % below 15% is yellow; 15% or higher is green
- Pump Room time is displayed in 12-hour AM/PM format
- Roll Count remains a separate app
