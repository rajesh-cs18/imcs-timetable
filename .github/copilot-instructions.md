# Project Context: Interactive Timetable & Lab Finder

## Goal
Build a lightweight, zero-backend, client-side web application hosted on GitHub Pages. The app allows students, teachers, and lab admins to view real-time class schedules, teacher workloads, and room/lab availability.

## Tech Stack
- Frontend: HTML5, CSS3 (Modern Flexbox/Grid), Vanilla JavaScript (ES6 Modules)
- Data Source: Static JSON file (`/data/timetable.json`)
- Hosting: GitHub Pages

## Architecture & Code Rules
1. **Zero Dependencies**: Keep the app modular and fast by using native DOM API and Vanilla JS.
2. **Pure Data Processing**: Keep time/schedule filtering logic isolated in `scheduler.js`.
3. **Optimized Token Context**:
   - Write concise, self-documenting functions.
   - Do not create redundant utility files.
   - Keep DOM manipulation functions focused and clean.
4. **Time & Schedule Rules**:
   - Time format in JSON is "H.MM To H.MM" (e.g., "8.30 To 9.20").
   - Support dynamic section filtering (`PM` / `PE`).
   - Treat subjects with "Lab" in their name or room as lab classes.

## Features to Implement
- **Live Status Bar**: Display current time, active classes, and currently available labs.
- **Role Filters**: Filter schedule by Cohort (`BS CS Part-I`), Teacher (`Initials/Name`), or Room Number (`Room 01`).
- **Free/Busy Lab Lookup**: Select a day/time slot to check if a lab is unoccupied for ad-hoc use.