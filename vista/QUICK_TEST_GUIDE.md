# 🧪 Quick Test Guide - Production Fixes

## ✅ Both Fixes Are Ready to Test!

### 🖥️ Servers Running
- ✅ Frontend: `http://localhost:3000`
- ✅ Backend: `http://localhost:5001`

---

## Test 1: Page Refresh Persistence 🔄

### Test 1A: Passenger on Booking Screen

**Steps:**
1. Open `http://localhost:3000`
2. Click **"Find a Ride Now"**
3. Login with any method (Google/Truecaller/Mobile OTP)
4. You should be on the booking screen
5. **Press F5 or Ctrl+R to refresh**

**✅ Expected Result:**
- You stay on the booking screen
- No redirect to landing page
- All your data persists

**❌ Old Behavior:**
- Would redirect to landing page
- Had to click "Find a Ride Now" again

---

### Test 1B: Driver During Onboarding

**Steps:**
1. Open `http://localhost:3000`
2. Click **"Open Driver's App"**
3. Login with any method
4. Start onboarding (enter email, select language, etc.)
5. Get to any onboarding screen (e.g., "Vehicle Selection")
6. **Press F5 or Ctrl+R to refresh**

**✅ Expected Result:**
- You stay on the same onboarding screen
- Can continue from where you left off
- No data loss

**❌ Old Behavior:**
- Would redirect to landing page
- Had to start onboarding again

---

## Test 2: Smart Driver Routing 🚗

### Test 2A: Not Logged In

**Steps:**
1. Open `http://localhost:3000`
2. Make sure you're logged out (click logout if needed)
3. Click **"Open Driver's App"**

**✅ Expected Result:**
- Shows login screen
- Toast: "Login as a driver"
- Same as before (no change)

---

### Test 2B: First-Time Driver (Logged In, No Driver Profile)

**Steps:**
1. Login as a user who hasn't registered as driver
   - Use `http://localhost:3000/auto-clear.html` to clear data
   - Login fresh
2. Click **"Open Driver's App"**

**✅ Expected Result:**
- Toast: "Checking driver status..."
- Then toast: "Complete driver registration"
- Goes to driver email collection screen
- Can start onboarding

**Console Should Show:**
```
🚗 Open drivers app clicked
✅ User logged in - checking driver status...
📝 No driver profile - starting onboarding
```

---

### Test 2C: Driver with Incomplete Onboarding

**Steps:**
1. Start driver onboarding
2. Complete a few steps (email, language, vehicle selection)
3. Click logout or close browser
4. Login again
5. Click **"Open Driver's App"**

**✅ Expected Result:**
- Toast: "Checking driver status..."
- Then toast: "Continue your driver registration"
- Goes directly to where you left off (e.g., Vehicle Selection)
- NO need to redo completed steps

**Console Should Show:**
```
🚗 Open drivers app clicked
✅ User logged in - checking driver status...
📊 Driver status: { onboarding_status: "VEHICLE_SELECTION", can_start_rides: false, is_verified: false }
⏳ Driver onboarding incomplete - resuming from: VEHICLE_SELECTION
```

---

### Test 2D: Fully Verified Driver

**Steps:**
1. Complete entire driver onboarding
2. Get verified by admin (or skip verification for testing)
3. Logout and login again
4. Click **"Open Driver's App"**

**✅ Expected Result:**
- Toast: "Checking driver status..."
- Then toast: "Welcome back!"
- Goes directly to driver dashboard
- NO onboarding screens at all

**Console Should Show:**
```
🚗 Open drivers app clicked
✅ User logged in - checking driver status...
📊 Driver status: { onboarding_status: "COMPLETED", can_start_rides: true, is_verified: true }
✅ Driver verified - going to dashboard
```

---

## 🔍 What to Watch For

### Browser Console Logs

**For Page Refresh:**
```
🔍 User preferences loaded (optimized) { hasToken: true, lastScreen: "booking" }
✅ Restoring last screen: booking
💾 Saved last screen: booking
```

**For Driver App Button:**
```
🚗 Open drivers app clicked
✅ User logged in - checking driver status...
📊 Driver status: { ... }
```

### Toast Notifications

Watch for these toasts:
- "Login as a driver" (not logged in)
- "Checking driver status..." (loading)
- "Complete driver registration" (first-time)
- "Continue your driver registration" (incomplete)
- "Welcome back!" (verified driver)

### Network Tab

Check for API call:
```
GET http://localhost:5001/api/driver/onboarding/status
Headers:
  Authorization: Bearer <token>
Response:
  200: Driver exists
  404: No driver profile
```

---

## 🚨 Troubleshooting

### Issue: Still redirecting to landing page on refresh

**Solution:**
1. Check browser console for errors
2. Verify token exists: `localStorage.getItem('accessToken')`
3. Check if last screen saved: `localStorage.getItem('raahi_last_screen')`
4. Clear cache and hard refresh (Ctrl+Shift+R)

### Issue: Driver app button not working

**Solution:**
1. Check backend is running: `http://localhost:5001/health`
2. Verify you're logged in: `localStorage.getItem('accessToken')`
3. Check browser console for API errors
4. Verify backend endpoint exists in `raahi-backend/src/routes/driverOnboarding.ts`

### Issue: Driver status not updating

**Solution:**
1. Check database: Driver profile should exist
2. Verify API response in Network tab
3. Check backend logs in terminal
4. Try logout and login again

---

## 📊 Test Checklist

Use this checklist while testing:

### Page Refresh Tests
- [ ] Refresh on landing page (should stay)
- [ ] Refresh on booking screen (should stay)
- [ ] Refresh during ride tracking (should stay)
- [ ] Refresh during driver onboarding (should stay)
- [ ] Refresh when not logged in (should go to landing)

### Driver App Button Tests
- [ ] Click when not logged in (should show login)
- [ ] Click as first-time driver (should start onboarding)
- [ ] Click with incomplete onboarding (should resume)
- [ ] Click as verified driver (should go to dashboard)
- [ ] Click with network error (should fallback gracefully)

### Edge Cases
- [ ] Expired token (should redirect to login)
- [ ] Invalid last screen in localStorage (should fallback)
- [ ] Backend down (should show error, allow retry)
- [ ] Mixed states (driver mode + passenger token)

---

## 🎯 Success Criteria

**Both fixes are working if:**

✅ **Page Refresh:**
- Users stay on their current screen after refresh
- No unexpected redirects to landing page
- Login state persists
- Onboarding progress persists

✅ **Driver App Button:**
- Not logged in → Shows login
- First-time driver → Starts onboarding
- Incomplete onboarding → Resumes from last step
- Verified driver → Goes to dashboard
- Clear feedback via toasts
- Proper error handling

---

## 🎉 Ready to Test!

1. **Frontend:** `http://localhost:3000`
2. **Backend:** `http://localhost:5001`
3. **Clear Storage:** `http://localhost:3000/auto-clear.html`

**All systems are running and ready for testing!**

---

**Last Updated:** October 15, 2025, 2:40 AM



