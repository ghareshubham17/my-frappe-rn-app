# Production-Ready Folder Structure

This document describes the final, clean folder structure for the Ashida Attendance mobile app.

## Overview

The app uses **Expo Router** for file-based routing with a clean, organized structure.

## Folder Structure

```
app/
├── components/                # Reusable UI components
│   ├── AttendanceCalendar.js
│   └── Navbar.js
│
├── contexts/                  # React contexts
│   └── AuthContext.js         # Authentication state management
│
├── data/                      # Constants and configuration
│   └── constants.js
│
├── services/                  # API services
│   └── frappeService.js       # Frappe API integration
│
├── (auth)/                    # Authentication screens group
│   ├── _layout.js            # Auth stack navigator
│   ├── LoginScreen.js        # → Route: /LoginScreen
│   └── SiteSetupScreen.js    # → Route: /SiteSetupScreen
│
├── (tabs)/                    # Bottom tabs group
│   ├── _layout.js            # Tab navigator with Navbar
│   ├── HomeScreen.js         # Home screen implementation
│   ├── index.js              # → Route: / (Home tab - imports HomeScreen)
│   ├── UpdatesScreen.js      # → Route: /UpdatesScreen
│   └── ProfileScreen.js      # → Route: /ProfileScreen
│
├── (screens)/                 # App screens group
│   ├── _layout.js            # Screens stack navigator
│   ├── LeaveApplicationScreen.js      # → Route: /LeaveApplicationScreen
│   ├── HolidaysScreen.js              # → Route: /HolidaysScreen
│   ├── ReportsScreen.js               # → Route: /ReportsScreen
│   └── MonthlyAttendanceScreen.js     # → Route: /MonthlyAttendanceScreen
│
├── _layout.js                 # Root layout (providers + auth logic)
└── index.js                   # Entry point (redirects based on auth)
```

## Key Conventions

### Folder Naming

1. **Lowercase folders**: Utility folders use lowercase naming
   - `components/` - Reusable UI components
   - `contexts/` - React contexts
   - `services/` - API services
   - `data/` - Constants and configuration

2. **Parentheses `()`**: Route groups that organize code without affecting URLs
   - `(auth)/` - Groups auth screens, doesn't add `/auth` to URL
   - `(tabs)/` - Groups tab screens
   - `(screens)/` - Groups app screens

### File Naming

- **Screen files**: PascalCase with "Screen" suffix
  - `LoginScreen.js`, `HomeScreen.js`, `ProfileScreen.js`
  - Clear indication that it's a screen component
  - Production-ready naming convention

- **Layout files**: Always `_layout.js`
  - Controls navigation structure for that group

- **Index files**: Always `index.js`
  - Default route for a directory

## Route Mapping

| File Path | URL Route | Tab/Screen Name |
|-----------|-----------|-----------------|
| `app/index.js` | `/` | Entry (redirects) |
| `app/(auth)/SiteSetupScreen.js` | `/SiteSetupScreen` | Site Setup |
| `app/(auth)/LoginScreen.js` | `/LoginScreen` | Login |
| `app/(tabs)/index.js` | `/` | **Home Tab** (when authenticated) |
| `app/(tabs)/UpdatesScreen.js` | `/UpdatesScreen` | **Updates Tab** |
| `app/(tabs)/ProfileScreen.js` | `/ProfileScreen` | **Profile Tab** |
| `app/(screens)/LeaveApplicationScreen.js` | `/LeaveApplicationScreen` | Apply for Leave |
| `app/(screens)/HolidaysScreen.js` | `/HolidaysScreen` | View Holidays |
| `app/(screens)/ReportsScreen.js` | `/ReportsScreen` | Reports Hub |
| `app/(screens)/MonthlyAttendanceScreen.js` | `/MonthlyAttendanceScreen` | Monthly Attendance |

## Bottom Tabs

The app displays exactly **3 tabs** at the bottom:

1. **Home** - Attendance tracking and quick actions
2. **Updates** - Notifications and activity feed
3. **Profile** - User settings and logout

## Navigation Examples

```javascript
import { useRouter } from 'expo-router';

const MyComponent = () => {
  const router = useRouter();

  // Navigate to screens
  router.push('/(screens)/LeaveApplicationScreen');
  router.push('/(screens)/HolidaysScreen');
  router.push('/(screens)/ReportsScreen');

  // Navigate to auth
  router.replace('/(auth)/LoginScreen');

  // Navigate to tabs
  router.push('/(tabs)/ProfileScreen');

  // Go back
  router.back();
};
```

## Import Paths

Since all shared code is in `app/`:

```javascript
// From root level files (app/_layout.js, app/index.js)
import { useAuth } from './contexts/AuthContext';
import { useFrappeService } from './services/frappeService';

// From group level files (app/(tabs)/*, app/(screens)/*, app/(auth)/*)
import { useAuth } from '../contexts/AuthContext';
import { useFrappeService } from '../services/frappeService';
import Navbar from '../components/Navbar';
import AttendanceCalendar from '../components/AttendanceCalendar';
```

## Benefits

✅ **Clean URLs** - No unnecessary path segments
✅ **Organized code** - Clear separation between routes, components, and utilities
✅ **Scalable** - Easy to add new screens without cluttering
✅ **Production-ready** - Professional naming conventions
✅ **Type-safe** - Clear file structure for TypeScript migration
✅ **No duplicate tabs** - Exactly 3 tabs as designed

## Adding New Screens

### Step 1: Create screen file in appropriate group

```javascript
// app/(screens)/NewFeatureScreen.js
import React from 'react';
import { View, Text } from 'react-native';

const NewFeatureScreen = () => {
  return (
    <View>
      <Text>New Feature</Text>
    </View>
  );
};

export default NewFeatureScreen;
```

### Step 2: Navigate to it

```javascript
router.push('/(screens)/NewFeatureScreen');
```

That's it! No need to register routes manually - Expo Router handles it automatically.

## Migrating from Old Structure

This structure evolved from the previous React Navigation setup:

**Before (React Navigation)**:
- Manual route registration
- Separate navigation config files
- `src/` folder at root level

**After (Expo Router)**:
- File-based routing
- Automatic route detection
- All code in `app/` folder
- Cleaner, more organized

## Dependencies

All required for Expo Router (installed):
- ✅ `expo-router` - File-based routing
- ✅ `@react-navigation/native` - Used by Expo Router internally
- ✅ `@react-navigation/bottom-tabs` - For tab navigation
- ✅ `@react-navigation/native-stack` - For stack navigation
- ✅ `react-native-screens` - Native screen components
- ✅ `react-native-safe-area-context` - Safe area handling

---

**Last Updated**: November 17, 2024
**Structure Version**: 2.0 (Production Ready)
