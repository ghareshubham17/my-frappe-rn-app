# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ashida Attendance** is a React Native mobile application built with Expo that connects to a Frappe/ERPNext backend for attendance tracking, leave management, and employee reports. The app uses session-based authentication with the Frappe API.

## Development Commands

### Running the App
```bash
npm start              # Start Expo development server
npm run android        # Run on Android device/emulator
npm run ios           # Run on iOS device/simulator
npm run web           # Run in web browser
```

### EAS Build (Expo Application Services)
The project is configured with EAS for production builds:
```bash
eas build --profile development    # Development build
eas build --profile preview        # Preview build (internal distribution)
eas build --profile production     # Production build (auto-increment version)
```

## Architecture

### App Structure

The app follows a **session-based authentication architecture** with a clear separation between authenticated and unauthenticated flows:

1. **Entry Point** (`App.js`):
   - Wraps the app with UI Kitten's ApplicationProvider (using Eva dark theme)
   - Provides SafeAreaProvider for safe area handling
   - Wraps navigation with AuthProvider for global authentication state

2. **Navigation** (`src/navigation/AppNavigator.js`):
   - Uses conditional rendering based on authentication status
   - **Unauthenticated**: Shows only LoginScreen
   - **Authenticated**: Shows HomeScreen with bottom tabs and nested screens (LeaveApplication, Holidays, ReportsScreen, MonthlyAttendanceSheet)

3. **Home Screen Structure** (`src/screens/HomeScreen.js`):
   - Contains a shared Navbar component
   - Bottom tab navigator with three tabs:
     - HomeTab: Main attendance tracking
     - UpdatesTab: Notifications and updates
     - ProfileTab: User profile and settings

### Authentication Flow (CRITICAL)

**This app uses SESSION-BASED authentication, NOT token-based authentication.**

- **AuthContext** (`src/contexts/AuthContext.js`):
  - All API calls use `credentials: 'include'` to send cookies automatically
  - NO Authorization headers are used
  - Session ID is stored in SecureStore for reference, but actual authentication is cookie-based
  - Login flow: POST to `/api/method/login` → stores session cookie → fetches user profile
  - Session validation: GET to `/api/method/frappe.auth.get_logged_user`
  - Logout: POST to `/api/method/logout` then clears local storage

**Important**: When making new API calls, always use `credentials: 'include'` and never add Authorization headers.

### Frappe API Integration

**Service Layer** (`src/services/frappeService.js`):
- Provides a hook-based interface: `useFrappeService()`
- Core CRUD operations: `getList()`, `getDoc()`, `createDoc()`, `updateDoc()`, `deleteDoc()`
- API method calls: `call()` (POST), `callGet()` (GET)
- Utility methods: `getCount()`, `getMeta()`
- All methods include error handling and loading states
- Base URL is configured in `src/data/constants.js` (currently: `https://demo-beta.gaxis.ashidabusiness.solutions`)

**API Pattern**:
```javascript
// Resource API (DocTypes)
GET    /api/resource/{doctype}
GET    /api/resource/{doctype}/{name}
POST   /api/resource/{doctype}
PUT    /api/resource/{doctype}/{name}
DELETE /api/resource/{doctype}/{name}

// Method API (Custom methods)
POST   /api/method/{method_name}
GET    /api/method/{method_name}
```

### Key Dependencies

- **Expo SDK 54**: Core framework for React Native development
- **React Navigation**: Stack and bottom tab navigation
- **UI Kitten**: Component library with Eva Design theming
- **React Hook Form**: Form management
- **expo-secure-store**: Secure credential storage
- **Lucide React Native**: Icon library

### File Organization

```
src/
├── components/         # Reusable UI components (Navbar, AttendanceCalendar)
├── contexts/          # React contexts (AuthContext for auth state)
├── data/              # Constants and configuration (BASE_URI)
├── navigation/        # Navigation setup (AppNavigator)
├── reports/           # Report screens (MonthlyAttendanceSheet)
├── screens/           # Full-page screens (LoginScreen, HomeScreen, etc.)
├── services/          # API services (frappeService)
└── tabs/              # Tab content screens (HomeTabScreen, UpdatesTabScreen, ProfileTabScreen)
```

## Important Notes

### Backend Configuration
- The app is hardcoded to connect to a specific Frappe backend URL in `src/data/constants.js`
- Change `BASE_URI` to point to a different Frappe instance if needed
- Ensure CORS is properly configured on the Frappe backend for mobile app access

### Platform-Specific Settings
- **Android**: Package name is `com.shubham17g.MyApp` with version code auto-increment
- **iOS**: Supports tablets
- React Native's new architecture is enabled (`newArchEnabled: true`)
- Edge-to-edge display enabled on Android

### Authentication Best Practices
- Never add manual Authorization headers - the session cookie handles auth automatically
- Always include `credentials: 'include'` in all fetch requests
- Session validation happens on app startup in AuthContext
- SecureStore is used only for persistence; actual auth relies on HTTP-only cookies

### Common Pitfalls
1. **Don't** use token-based auth patterns - this is session-based
2. **Don't** store passwords in SecureStore - only user info and session reference
3. **Do** handle session expiration gracefully (401 responses should trigger logout)
4. **Do** maintain consistent error handling patterns from frappeService
