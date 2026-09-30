# Extrusion Sr. Lead Daily Checklist — v1.17

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


## v1.15 — Inventory order + tank visuals + compact PDF
- Inventory input order changed to Talc → Butane → CO2 → Silos 1–5.
- Report Inventory Levels now shows a compact horizontal Butane tank and vertical CO2 tank with the existing values.
- CO2 still shows inches WC, calculated gallons, and percent full.
- Saved/share PDF layout now packs Safety and Productivity/Blends together when space allows, reducing wasted white space and normally producing a tighter two-page report.
- Equipment / Inventory / Notes remains grouped together and compact.

## v1.17 — Silo weight readability fix
- Added more vertical clearance below the silo graphics so the weight labels are not covered by the Talc row in emailed/mobile PDF previews.
- Increased silo weight text from 18 px to 22 px for easier reading after PDF scaling.
- Raised JPEG export quality from 0.90 to 0.96 to keep small report text crisper in email/PDF viewers.
- Inventory logic and approved Talc/Butane/CO2 visuals are unchanged.

## v1.16 — Approved dynamic Inventory report visuals
- Report-only Inventory Levels redesign based on the approved mockup.
- Silo 1 is visually smaller and uses an 80,000 lb capacity.
- Silos 2–5 use 185,000 lb capacity each.
- Silo material level is shown inside a semi-transparent silo and follows the entered pounds as a percentage of that silo's capacity.
- Report silo pound-number color now uses percentage of capacity: below 20% red, 20% to under 50% yellow, 50% and above green.
- Report attention messages for silos now use those same percentage thresholds.
- Talc report row now includes a Gaylord box visual and the Talc box count.
- Butane report tank is semi-transparent, shows the liquid level from the entered percentage, and places the percentage inside the tank.
- CO2 report tank keeps a compact upright shape, is semi-transparent, shows the calculated percentage as the internal level, keeps the percentage inside the tank, and displays inches WC and gallons beside it.
- Inventory input workflow/order remains unchanged from v1.15; these visual changes are for the report/PDF.
