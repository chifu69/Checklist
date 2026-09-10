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


## v1.11 — Saved Checklists
- **Save Checklist** now creates a PDF snapshot and stores it inside the PWA using IndexedDB.
- One saved PDF is kept per Date + Shift; pressing Save again updates that shift instead of creating duplicates.
- Added **Saved Checklists** with Open PDF, Share, and Delete actions.
- Saved PDFs remain available after clearing the current shift checklist.
- Current checklist fields continue to autosave while data is entered.


## v1.12 — Line-first workflow
- Combined Productivity, Blends, and all line-specific Equipment checks into one Line Checks screen.
- EXT1 / EXT2 / EXT3 / EXT4 are now the floating/sticky controls while completing line checks.
- Switching lines automatically returns to the top of the Line Checks screen so the next line can be started immediately.
- Pump Room, Mechanical Room, and Screen Pack checks remain in a separate Common Areas section because they do not belong to a single line.
- Existing report format, saved PDFs, inventory rules, CO2 tank conversion, Running/Down behavior, and automatic timestamps are preserved.


## v1.13
- Fixed checklist progress when lines are marked DOWN.
- Productivity, blends, gas, and line-specific equipment on a DOWN line no longer count as required items.
- Equipment checks remain visible and can still be completed on a DOWN line, but they are optional for checklist completion.


## v1.14
- Removed the extra Virgin 2 optional helper text.
- Removed the extra Silo in Use automatic helper text.
- No other behavior changed.
