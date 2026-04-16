# Pokémon Med

A daily Ritalin medication tracking and scheduling application. Schedule doses throughout your day, receive notifications when it's time to take your medication, and track your progress—all with a clean, minimal interface.

## Features

- **Three Protocol Levels**: Choose from three dosage protocols (Charmander, Charmeleon, Charizard) with different intensity levels and dose counts
- **Smart Scheduling**: Automatically calculates dose times based on pill portions and spacing requirements
- **Time Cutoff**: Respects an 18:00 (6 PM) cutoff to prevent sleep disruption
- **Notifications**: Receive browser notifications when it's time for your next dose
- **Progress Tracking**: Visual display of completed doses vs. remaining doses
- **Dose Logging**: Hold-to-confirm button for logging when you've taken each dose
- **Schedule Management**: View full schedule, toggle visibility of past doses, and undo recent entries
- **Persistent Storage**: All schedules and progress saved to local storage
- **Shareable Links**: Share your current schedule configuration via URL parameters

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Bun (for running with the bundler)

### Installation

```bash
git clone <repo-url>
cd ritalin-calculator
bun install
```

### Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
bun run build
bun run start
```

## How It Works

### Setting Up Your Protocol

1. **Select a Protocol Level**:
   - **Charmander** (Soft Focus): 6 doses throughout the day
   - **Charmeleon** (Deep Work): 4 doses throughout the day
   - **Charizard** (Overdrive): 3 doses throughout the day

2. **Set Your Start Time**: Choose when you'll take your first dose (or tap "Now")

3. **Engage Protocol**: Start your schedule

### During the Day

- The app displays your **next dose time** prominently
- Your **current progress** shows pills completed vs. total pills
- **Hold the button** to log when you've consumed each dose
- **Schedule list** shows all upcoming and completed doses
- **Notifications** alert you when it's time for your next dose

### Dose Spacing

The app automatically calculates spacing based on pill portions:
- Single-pill doses: 105 minutes apart
- Multi-pill doses: 210 minutes apart

### Schedule Adjustments

If your schedule would extend past 6 PM, the app will:
- Show a warning modal
- Allow you to proceed with a truncated schedule
- Automatically cutoff doses after 18:00

## Technology Stack

- **Frontend**: React 19 with TypeScript
- **Framework**: Next.js 16
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: Service Workers + Notifications API
- **Runtime**: Bun

## Browser Support

- Chrome/Edge 88+
- Firefox 87+
- Safari 14+
- Requires support for:
  - Desktop Notifications API
  - Service Workers
  - LocalStorage

## Privacy & Data

All data is stored **locally in your browser**. No information is sent to external servers. Your schedule and progress remain on your device.

## Customization

### Modifying Protocols

Edit the `PROTOCOLS` object in `app/page.tsx` to change:
- Number of doses (`maxDoses`)
- Pill portions per dose (`portions` array)

### Theme Colors

The `THEMES` object in `app/page.tsx` controls the color scheme for each protocol level.

## Notes

This app is designed as a personal medication tracking tool. Always consult with your healthcare provider about your medication schedule and dosing. This app does not provide medical advice.

## License

Private project. All rights reserved.
