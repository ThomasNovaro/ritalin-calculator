# dose

A small, private PWA built to help someone remember medication on time.

This app was made with care for a friend who wanted a simple, reliable way to stay on top of daily medication reminders. It's designed to be easy to use, calm to look at, and focused on one job: helping with daily consistency.

## Why this exists

Taking medication on schedule can be easy to forget during a busy day. This app helps by giving you a clear start point, showing what comes next, and keeping your full schedule visible at a glance. No complicated setup, no noise—just reminders that work.

## What it does

- Set up a medication schedule in seconds
- See your next reminder clearly
- Track progress through the day
- Get browser notifications when reminders are due
- Save everything locally in your browser
- Install as a PWA for an app-like experience on desktop and mobile

## Getting started

### Requirements

- Node.js 18 or higher
- Bun

### Install and run locally

```bash
git clone <repo-url>
cd ritalin-calculator
bun install
bun run dev
```

Open `http://localhost:3000` in your browser.

### Build for production

```bash
bun run build
bun run start
```

## How it works

1. **Choose a schedule**: Pick how many reminders you want throughout the day
2. **Set a start time**: Pick when you'll take your first dose (or use "now")
3. **Start your day**: The app shows your next reminder and tracks your progress
4. **Get notified**: Browser notifications remind you when it's time
5. **Log completion**: Tap and hold to confirm when you've taken each dose

The app automatically spaces out reminders and stops adding new ones after 6 PM to avoid sleep disruption. If your schedule would run too late, you'll see a warning and can adjust.

## Privacy and data

- **Everything stays on your device** — no data is sent to any server
- Schedule and progress are stored in your browser's local storage
- If you clear your browser data, your schedule will be reset
- The app works offline once loaded

## Accessibility

This app is built to be as straightforward as possible:

- Clear visual hierarchy with large, easy-to-tap buttons
- Minimal steps to get started
- Browser notifications instead of requiring a separate app
- Works on phones, tablets, and desktop

If you find something hard to use or understand, please open an issue.

## Tech stack

- **Framework**: Next.js 16
- **Language**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Runtime**: Bun

## Important note

This app is a reminder tool only. It does not provide medical advice and is not a substitute for guidance from your healthcare provider. Always follow your doctor's instructions for your medication schedule.
