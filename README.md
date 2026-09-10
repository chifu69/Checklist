# Extrusion Sr. Lead Daily Checklist — v1.9

Phone-friendly PWA based on the supplied Sr. Lead Daily Checklist.

## v1.9
- Added RUNNING / DOWN status for each extrusion line.
- A DOWN line is not counted as incomplete for Productivity / Blends.
- The report shows each line's RUNNING / DOWN status.
- Added automatic time stamps:
  - Safety checks record the time when checked.
  - Equipment YES/NO selections record the time automatically.
  - Common-area inspections record the time automatically.
  - Pump Room time is now automatic; no manual time entry is required.
- Fixed iPhone numeric-entry focus:
  - Silo fields no longer re-render after every digit.
  - Productivity Butane / CO₂ fields no longer re-render after every digit.
  - The keyboard stays open while entering multi-digit values.
- Existing v1.8 inventory colors, Talc warning, detailed attention list, Share Report, and report formatting remain.

## Current process rules
- Outside Air: 3–8 PSI
- Inside Air: 20–50 PSI
- Differential: under 600 green, 600–800 yellow, above 800 red
- CO₂ % is calculated per running line from CO₂ / (Butane + CO₂)
- CO₂ % below 15% is yellow; 15% or higher is green
- Silos: >100,000 lb green; 50,000–100,000 yellow; <50,000 red
- Talc below 14 boxes is red
- EPIC photo scanning remains removed for now


Version v1.10 updates:
- CO2 tank input now uses inches WC and the report expands it to inches WC, gallons, and percent full.
- Virgin 2 is optional and now automatically sets Silo in Use to Yes/No.
- Down lines display a dash in report value cells instead of repeating DOWN everywhere.
