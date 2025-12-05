# Layout Files Guide - Understanding the 4 _layout.js Files

This guide explains why you have 4 `_layout.js` files and what each one does.

## Visual Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  app/_layout.js (ROOT LAYOUT)                               │
│  • Providers: Auth, Theme, SafeArea                         │
│  • Auth logic: decides what to show                         │
│  ├─────────────────────────────────────────────────────────┤
│  │                                                           │
│  │  If NOT authenticated → (auth) group                     │
│  │  ┌───────────────────────────────────────────┐          │
│  │  │ app/(auth)/_layout.js (AUTH STACK)        │          │
│  │  │ • Stack Navigator                         │          │
│  │  │ • Screens:                                │          │
│  │  │   - SiteSetupScreen (first time)          │          │
│  │  │   - LoginScreen                           │          │
│  │  └───────────────────────────────────────────┘          │
│  │                                                           │
│  │  If authenticated → (tabs) group                         │
│  │  ┌───────────────────────────────────────────┐          │
│  │  │ app/(tabs)/_layout.js (TAB NAVIGATOR)     │          │
│  │  │ • Bottom Tab Navigator                    │          │
│  │  │ • Navbar at top                           │          │
│  │  │ • Tabs:                                   │          │
│  │  │   📱 Home (index.js → _HomeScreen.js)     │          │
│  │  │   🔔 Updates (UpdatesScreen.js)           │          │
│  │  │   👤 Profile (ProfileScreen.js)           │          │
│  │  └───────────────────────────────────────────┘          │
│  │                                                           │
│  │  When navigating to other screens → (screens) group     │
│  │  ┌───────────────────────────────────────────┐          │
│  │  │ app/(screens)/_layout.js (SCREENS STACK)  │          │
│  │  │ • Stack Navigator                         │          │
│  │  │ • Screens:                                │          │
│  │  │   - LeaveApplicationScreen                │          │
│  │  │   - HolidaysScreen                        │          │
│  │  │   - ReportsScreen                         │          │
│  │  │   - MonthlyAttendanceScreen               │          │
│  │  └───────────────────────────────────────────┘          │
│  │                                                           │
│  └─────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

## Detailed Explanation

### 1. app/_layout.js (ROOT - Most Important)

**Purpose**: Entry point for entire app

**What it does**:
- Wraps app with providers (AuthProvider, ThemeProvider, SafeAreaProvider)
- Checks if user is authenticated
- Redirects to appropriate route group:
  - No site URL? → `(auth)/SiteSetupScreen`
  - Not logged in? → `(auth)/LoginScreen`
  - Logged in? → `(tabs)/` (Home screen)

**Code structure**:
```javascript
<SafeAreaProvider>
  <ThemeProvider>
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(screens)" />
      </Stack>
    </AuthProvider>
  </ThemeProvider>
</SafeAreaProvider>
```

---

### 2. app/(auth)/_layout.js (AUTH STACK)

**Purpose**: Navigation for unauthenticated users

**What it does**:
- Stack navigator for login flow
- Manages auth-related screens
- No header shown (full screen experience)

**Screens managed**:
- `SiteSetupScreen` - First-time setup
- `LoginScreen` - User login

**When shown**: Only when user is NOT authenticated

---

### 3. app/(tabs)/_layout.js (TAB NAVIGATOR)

**Purpose**: Main app navigation for authenticated users

**What it does**:
- Bottom tab navigation
- Shows Navbar at top of all tabs
- Manages 3 tabs with icons

**Tabs**:
1. **Home** (`index.js` → imports `_HomeScreen.js`)
   - Attendance tracking
   - Quick actions

2. **Updates** (`UpdatesScreen.js`)
   - Notifications
   - Activity feed

3. **Profile** (`ProfileScreen.js`)
   - User info
   - Settings
   - Logout

**When shown**: When user is authenticated and in main app

---

### 4. app/(screens)/_layout.js (SCREENS STACK)

**Purpose**: Navigation for other app screens

**What it does**:
- Stack navigator for full-screen pages
- Card presentation style
- No header (screens have their own headers)

**Screens managed**:
- `LeaveApplicationScreen` - Apply for leave
- `HolidaysScreen` - View holidays
- `ReportsScreen` - Reports hub
- `MonthlyAttendanceScreen` - Monthly report

**When shown**: When user navigates from tabs to these screens

---

## Why This Pattern?

### ✅ Benefits of Multiple Layouts

1. **Separation of Concerns**
   - Each section has its own navigation logic
   - Easy to modify one without affecting others

2. **Clean Code**
   - Auth logic separate from app logic
   - Tab navigation separate from screen navigation

3. **Performance**
   - Only loads necessary layouts
   - Efficient navigation

4. **Scalability**
   - Easy to add new route groups
   - Easy to add new screens to existing groups

5. **Type Safety**
   - Clear navigation hierarchy
   - Better TypeScript support

---

## Common Operations

### Adding a New Tab

Edit: `app/(tabs)/_layout.js`

```javascript
<Tabs.Screen
  name="NewTabScreen"
  options={{
    title: 'New Tab',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="star" size={size} color={color} />
    ),
  }}
/>
```

### Adding a New Screen (to screens group)

1. Create: `app/(screens)/NewScreen.js`
2. Register in: `app/(screens)/_layout.js`

```javascript
<Stack.Screen
  name="NewScreen"
  options={{ presentation: 'card' }}
/>
```

### Adding a New Auth Screen

1. Create: `app/(auth)/NewAuthScreen.js`
2. Register in: `app/(auth)/_layout.js`

```javascript
<Stack.Screen name="NewAuthScreen" />
```

---

## Navigation Flow Example

### User Opens App

1. **app/_layout.js** checks authentication
2. If not authenticated:
   - Shows **(auth)/_layout.js**
   - User sees `LoginScreen`
3. After login:
   - Shows **(tabs)/_layout.js**
   - User sees Home tab
4. User clicks "Apply Leave":
   - Navigates to **(screens)/_layout.js**
   - Shows `LeaveApplicationScreen`
5. User goes back:
   - Returns to **(tabs)/_layout.js**
   - Back to Home tab

---

## Quick Reference

| File | Type | Purpose | Screens |
|------|------|---------|---------|
| `app/_layout.js` | Root | App setup + auth redirect | All groups |
| `app/(auth)/_layout.js` | Stack | Login flow | Setup, Login |
| `app/(tabs)/_layout.js` | Tabs | Main app | Home, Updates, Profile |
| `app/(screens)/_layout.js` | Stack | Other screens | Leave, Holidays, Reports |

---

## Summary

**This is NOT confusion - this is the CORRECT Expo Router pattern!**

Each `_layout.js` file serves a specific purpose and controls navigation for its section. This modular approach keeps your code organized, maintainable, and scalable.

Think of it like a tree:
- **Root** (app/_layout.js) is the trunk
- **(auth)**, **(tabs)**, **(screens)** are branches
- Individual screens are leaves

Each branch (layout) manages its own leaves (screens) independently!
