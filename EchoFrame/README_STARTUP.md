# EchoFrames MVP - Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- Expo Go app installed on your iOS/Android phone OR use an emulator
- Supabase account and credentials configured in `.env`

## Installation & Startup

### 1. Install dependencies (already done)

```bash
npm install
```

### 2. Configure environment

The `.env` file already contains your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key
```

### 3. Start the development server

```bash
npm start
```

This launches Expo Metro Bundler on http://localhost:8081

### 4. Run on device/emulator

**On iOS Simulator:**

```bash
npm run ios
```

**On Android Emulator:**

```bash
npm run android
```

**On your phone with Expo Go:**

- Scan the QR code shown in the terminal with Expo Go app
- App will load directly

## What You Can Do

### First Launch

1. **Sign Up** - Create account with email and password
2. **Grant Permissions** - Allow camera and location access
3. **Take a Photo** - Tap Camera tab to capture a photo with location
4. **View on Map** - See your photo appear as a marker on the map
5. **Discover Echoes** - As you move, nearby echoes appear on the map
6. **Rate Content** - Tap an echo to view details and rate it

### Features

- **Map**: Shows your location (blue marker) and nearby echoes (red markers)
- **Camera**: Capture photos with automatic GPS location tagging
- **Echoes**: View photos left by others at nearby locations
- **Ratings**: Upvote/downvote echoes you discover
- **Profile**: View your stats and sign out
- **Settings**: Configure notifications and discovery preferences

## File Structure

```
app/
  (app)/          # Main app screens
    map.tsx       # Map display
    camera.tsx    # Camera capture
    profile.tsx   # User profile
    settings.tsx  # Settings
    echo/[id].tsx # Echo detail view
  (auth)/         # Auth screens
    signin.tsx    # Sign in
    signup.tsx    # Sign up
lib/
  auth-context.tsx      # Auth state
  echo-service.ts       # Echo CRUD
  location-service.ts   # Geolocation
  discovery-service.ts  # Notifications
```

## Development Commands

```bash
npm start          # Start dev server
npm run lint       # Run ESLint
npm run ios        # Launch iOS simulator
npm run android    # Launch Android emulator
npm run web        # Launch web version
```

## Troubleshooting

### Camera not working

- Check permissions granted in system settings
- iOS: Settings > EchoFrame > Camera
- Android: Settings > Apps > EchoFrame > Permissions > Camera

### Location not detected

- Enable Location Services on device
- Grant permission when prompted by app
- Android: Settings > Apps > EchoFrame > Permissions > Location

### App won't start

- Clear Metro cache: `npm start -- --clear`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node version: `node --version` (should be 18+)

### No echoes appearing on map

- Other users need to be close by geographically
- Detection radius is 500m
- Wait 60 seconds for location polling to run

## Architecture Overview

The app uses:

- **Frontend**: Expo + React Native + TypeScript
- **Navigation**: Expo Router v6
- **State**: React Context
- **Backend**: Supabase PostgreSQL
- **Geolocation**: PostGIS extension
- **Maps**: react-native-maps
- **Storage**: Supabase Storage

## Next Steps

After testing the MVP:

1. Deploy to Expo EAS (optional)
2. Build APK/IPA for app stores
3. Add Phase 2 features: comments, messaging, follow system
4. Implement geofencing (Phase 3)
5. Add offline support and caching

## Support

For issues, check:

- `.env` file has correct Supabase credentials
- Supabase project is running
- All permissions granted on device
- Metro Bundler showing no critical errors

---

**EchoFrames MVP is ready to go! 🎵**
