# LogExercises

LogExercises is a mobile-first workout tracker for recording daily training sessions. It helps you start a workout for today, add exercises, track sets, mark exercises complete, and review previous workouts from a calendar view.

## Features

- Start and complete a workout for the current day.
- Add exercises from built-in templates or create your own custom exercises.
- Track weighted exercises as well as reps-only movements.
- Review workout history on a calendar with completion indicators.
- Store workout history and custom exercise templates locally in the browser.
- Use a dark, gym-focused interface built with React, Tailwind CSS, and motion animations.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- date-fns
- lucide-react

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Start the development server:
   `npm run dev`
3. Open the local URL printed by Vite, usually `http://localhost:3000`.

## Available Scripts

- `npm run dev` starts the Vite development server.
- `npm run build` creates a production build.
- `npm run preview` serves the production build locally.
- `npm run lint` runs TypeScript checks.

## Data Storage

Workout data is saved in `localStorage` under the `reptrack_data` key. The app does not require an account or backend service for normal use.
