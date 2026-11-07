# Grantly

Scholarship matcher, deadline planner and document checklist for students.

## The problem
Students miss scholarships because (1) eligibility rules are hard to read, (2) deadlines are scattered, and (3) the same documents get rebuilt for every application.

## What Grantly does
- **Discover**: checks every rule (level, field, citizenship, score, need) against your profile. Shows a fit meter, near misses ("you are 3% short") and sorts by fit, deadline, value or effort.
- **My plan**: Saved, Preparing, Submitted and Result board with notes, a "next up" summary and `.ics` calendar export.
- **Deadlines**: timeline ruler of the next 66 days, grouped by urgency.
- **Documents**: one reusable checklist, ranked by how many scholarships need each item.

## Run it
Open `index.html` in any modern browser. No build step, no dependencies, no network except Google Fonts.

## Tech and decisions
Vanilla HTML, CSS and JS, split by responsibility:

| File | Role |
|---|---|
| `index.html` | Page shell, meta tags, skip link |
| `styles.css` | Theme tokens (light/dark), layout, components, responsive rules |
| `data.js` | Option lists, document catalogue, sample scholarships, defaults |
| `app.js` | State and storage, `evalS` matching logic, views, dialogs, events |
 Data lives in `SCH`; matching logic is the pure function `evalS(scholarship, profile)`. State is saved to `localStorage`. Deadlines are relative to today so the demo never goes stale.

## Accessibility
Skip link, landmarks, real buttons for every action, modal dialog with inert background and focus return, `prefers-reduced-motion`, light and dark themes, keyboard search (`/`).

## Limits
Listings are sample data, not real scholarships. There is no backend or account system.
