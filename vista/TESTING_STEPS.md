# 🧪 Testing Steps - Fresh User Flow

## ⚠️ IMPORTANT: Follow These Steps EXACTLY

### Step 1: Open Browser Console
1. Press `F12` or `Cmd+Option+I` (Mac) to open DevTools
2. Go to the **Console** tab
3. Keep it open throughout testing

### Step 2: Completely Clear Browser Storage

**Method 1: Using Browser Console (RECOMMENDED)**
1. In the Console tab, paste this and press Enter:

```javascript
// Clear absolutely everything
localStorage.clear();
sessionStorage.clear();
console.log('✅ Storage cleared');

// Verify it's empty
console.log('📦 localStorage length:', localStorage.length);
console.log('📦 sessionStorage length:', sessionStorage.length);
```

**Method 2: Using DevTools Application Tab**
1. Click **Application** tab in DevTools
2. Under **Storage** section:
   - Right-click **Local Storage** → **Clear**
   - Right-click **Session Storage** → **Clear**
   - Right-click **Cookies** → **Clear all**

### Step 3: Hard Refresh the Page

**Mac:**
- Chrome/Edge: `Cmd + Shift + R`
- Safari: `Cmd + Option + R`

**Windows/Linux:**
- Chrome/Edge: `Ctrl + Shift + R` or `Ctrl + F5`

**OR**

1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Step 4: Verify Console Logs

After the page loads, you should see these logs in console:

```
🔍 User preferences loaded (optimized) {hasAccepted: false, userEmail: null, driverMode: false}
🔄 Syncing auth state: {authIsAuthenticated: false, authUser: null, appStateIsLoggedIn: false}
🏠 Rendering Dashboard Screen {isLoggedIn: false, userEmail: null}
🏠 DashboardScreen render: {isLoggedIn: false, userEmail: undefined}
👤 UserAccountButton: {isLoggedIn: false, userEmail: undefined, willShow: false}
❌ UserAccountButton: Not showing (user not logged in or no email)
```

### Step 5: Verify Visual State

You should see a **CLEAN** dashboard with:
- ✅ **NO user account button** at the top (no john.doe@example.com)
- ✅ Raahi logo in the center
- ✅ "Butter to your जाम" tagline
- ✅ **"Find a Ride Now!"** button (golden/orange)
- ✅ **"Open Drivers' App"** button (cream colored)
- ✅ **NO "Switch Account?"** link at the bottom
- ✅ Footer: "Curated with love in Delhi, NCR 💛"

### Step 6: Test "Find a Ride Now" Flow

1. Click the **"Find a Ride Now!"** button
2. Check console logs - you should see:

```
🚗 Find ride clicked
🔍 Auth state check: {auth.isAuthenticated: false, auth.user: null, isLoggedIn: false, currentScreen: "dashboard"}
🔐 User not authenticated, redirecting to login
❌ Auth failed because: {authContextAuthenticated: false, appStateLoggedIn: false}
```

3. You should be redirected to the **Login Screen** with:
   - ✅ Login Via OTP on truecaller (dark button)
   - ✅ Login with Google (cream button)
   - ✅ Login with Mobile OTP (underlined text)
   
4. You should see a toast notification:
   - ✅ "Please login to book a ride"

---

## 🚨 If You Still See john.doe@example.com

If you STILL see the user button with "john.doe@example.com", do this:

### Emergency Clear Script

Open browser console and run:

```javascript
// Nuclear option - clear EVERYTHING
(function() {
  console.log('🧹 Starting emergency clear...');
  
  // Clear localStorage
  const lsKeys = Object.keys(localStorage);
  console.log('📦 localStorage keys before:', lsKeys);
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear all cookies
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  
  // Clear IndexedDB
  if (window.indexedDB) {
    indexedDB.databases().then(dbs => {
      dbs.forEach(db => {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
          console.log('🗄️ Deleted:', db.name);
        }
      });
    });
  }
  
  console.log('✅ Emergency clear complete!');
  console.log('🔄 Now doing hard refresh...');
  
  // Force hard reload
  setTimeout(() => {
    location.reload(true);
  }, 1000);
})();
```

This will automatically refresh the page after 1 second.

---

## 🔍 Debugging Checklist

If something is not working, check these:

### ❌ Problem: Still seeing user button
**Debug:**
1. Check console for: `🏠 DashboardScreen render: {isLoggedIn: ?, userEmail: ?}`
2. If `isLoggedIn: true`, storage wasn't cleared properly
3. Run the emergency clear script above

### ❌ Problem: Not redirected to login
**Debug:**
1. Check console for: `🔍 Auth state check: {...}`
2. Both `auth.isAuthenticated` and `isLoggedIn` should be `false`
3. If either is `true`, clear storage again

### ❌ Problem: Console shows old logs
**Debug:**
1. You might have multiple tabs open
2. Close ALL tabs with `localhost:3000`
3. Open a fresh tab
4. Clear storage
5. Hard refresh

### ❌ Problem: Changes not appearing
**Debug:**
1. Check if multiple Vite servers are running:
   ```bash
   ps aux | grep vite
   ```
2. Kill all and restart:
   ```bash
   pkill -9 -f vite
   cd /Users/sarthakmishra/Raahi-1.0
   npm run dev
   ```

---

## ✅ Expected Flow (Complete)

### Fresh User Journey:

```
1. Open http://localhost:3000
   ↓
2. See clean dashboard (NO user button, NO switch account link)
   ↓
3. Click "Find a Ride Now!"
   ↓
4. Redirected to Login Screen
   ↓
5. See toast: "Please login to book a ride"
   ↓
6. Choose login method (Google/Truecaller/Mobile OTP)
   ↓
7. After successful login, back to Dashboard
   ↓
8. NOW see user button (with your email) at top
   ↓
9. NOW see "Switch Account?" link at bottom
   ↓
10. Click "Find a Ride Now!" again
   ↓
11. Go to Ride Booking Screen (NOT login)
```

---

## 📞 Need Help?

If you're still stuck, share these from console:
1. Screenshot of console logs
2. Value of: `localStorage.length`
3. Value of: `sessionStorage.length`
4. Console log: `🏠 DashboardScreen render: {...}`

---

**Last Updated:** October 15, 2025, 12:48 AM  
**Server Status:** ✅ Running on http://localhost:3000



