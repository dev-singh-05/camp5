# Campus5 Expo App

This is the React Native (Expo) version of the Campus5 dashboard.

## Features

- Dashboard with navigation cards (Clubs, Dating, Ratings)
- Token balance display
- News/updates feed
- Stats display
- Same design as web version using NativeWind (Tailwind for React Native)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Supabase:
   - Copy your Supabase URL and Anon Key from the Next.js `.env.local` file
   - Update `/utils/supabaseClient.ts` with your credentials
   - Or create a `.env` file:
     ```
     EXPO_PUBLIC_SUPABASE_URL=your_url_here
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key_here
     ```

## Running the App

### On Physical Device (Easiest)
1. Install Expo Go app on your phone:
   - iOS: App Store
   - Android: Google Play

2. Start the development server:
   ```bash
   npm start
   ```

3. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

### On iOS Simulator (Mac only)
```bash
npm run ios
```

### On Android Emulator
```bash
npm run android
```

## Tech Stack

- **Expo** - React Native framework
- **Expo Router** - File-based routing
- **NativeWind** - Tailwind CSS for React Native
- **React Native Reanimated** - Smooth animations
- **Lucide React Native** - Icons
- **Supabase** - Backend

## Project Structure

```
expo-app/
├── app/
│   ├── _layout.tsx      # Root layout
│   └── index.tsx        # Dashboard screen
├── utils/
│   └── supabaseClient.ts # Supabase configuration
├── global.css           # Tailwind styles
├── tailwind.config.js   # Tailwind configuration
└── metro.config.js      # Metro bundler config
```

## Next Steps

1. Add navigation between screens (Clubs, Dating, Ratings)
2. Implement authentication screens
3. Add more features from the web version
4. Build for production with `eas build`
