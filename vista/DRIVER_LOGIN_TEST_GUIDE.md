# 🧪 Driver Login Test Guide

## ✅ Test Drivers Created Successfully!

Two test drivers have been created in the database with different onboarding statuses.

---

## 🚗 Test Driver 1: VERIFIED DRIVER

### Details:
- **Phone:** `+919876543210`
- **OTP:** `123456` (or any 6-digit code in development mode)
- **Status:** Onboarding COMPLETED ✅
- **Documents:** All verified (License, RC, Insurance, Profile Photo)
- **Verification:** isVerified = true
- **Total Rides:** 250
- **Rating:** 4.8 ⭐
- **Vehicle:** Silver Honda City 2022 (DL01AB1234)

### Expected Behavior:
✅ **Should go directly to Driver Dashboard ("Go online" page)**

### Test Flow:
```
1. Open: http://localhost:3000
2. Click: "Open Driver's App"
3. Login with Mobile OTP:
   - Country Code: +91
   - Phone: 9876543210
   - OTP: 123456
4. ✅ Should show: "Checking driver status..."
5. ✅ Should show: "Welcome back!"
6. ✅ Should navigate to: Driver Dashboard
7. ✅ Should see: "Go online" button
```

### Console Logs to Verify:
```javascript
🚗 Open drivers app clicked
✅ User logged in - checking driver status...
📊 Driver status: { 
  onboarding_status: "COMPLETED", 
  can_start_rides: true, 
  is_verified: true 
}
✅ Driver verified - going to dashboard
```

---

## 🆕 Test Driver 2: FRESH DRIVER

### Details:
- **Phone:** `+919876543211`
- **OTP:** `123456` (or any 6-digit code in development mode)
- **Status:** Onboarding EMAIL_COLLECTION (just started)
- **Documents:** None
- **Verification:** isVerified = false
- **Total Rides:** 0
- **Rating:** 0.0
- **Vehicle:** Not set yet

### Expected Behavior:
✅ **Should go to Driver Onboarding (Email Collection screen)**

### Test Flow:
```
1. Open: http://localhost:3000
2. Click: "Open Driver's App"
3. Login with Mobile OTP:
   - Country Code: +91
   - Phone: 9876543211
   - OTP: 123456
4. ✅ Should show: "Driver login successful!"
5. ✅ Should navigate to: Driver Email Collection
6. ✅ Should see: "Sign-in Details Required" page
7. ✅ Can complete onboarding from start
```

### Console Logs to Verify:
```javascript
🚗 Driver OTP verified
🚗 Driver OTP verified - redirecting to driver onboarding
Driver login successful!
🚗 Initializing driver onboarding...
✅ Driver profile initialized: { driver_id: "...", onboarding_status: "EMAIL_COLLECTION" }
```

---

## 🎯 Complete Testing Checklist

### Test 1: Verified Driver Login ✅
- [ ] Click "Open Driver's App"
- [ ] Login with +919876543210
- [ ] Enter OTP: 123456
- [ ] Verify toast: "Welcome back!"
- [ ] Verify screen: Driver Dashboard
- [ ] Verify button: "Go online" is visible
- [ ] Verify driver info displays correctly
- [ ] Try clicking "Go online" button

### Test 2: Fresh Driver Login ✅
- [ ] Logout (if logged in)
- [ ] Click "Open Driver's App"
- [ ] Login with +919876543211
- [ ] Enter OTP: 123456
- [ ] Verify toast: "Driver login successful!"
- [ ] Verify screen: Driver Email Collection
- [ ] Verify heading: "Sign-in Details Required"
- [ ] Try entering email and continuing
- [ ] Complete onboarding steps

### Test 3: Page Refresh (Verified Driver) ✅
- [ ] Login as verified driver (+919876543210)
- [ ] Navigate to Driver Dashboard
- [ ] Press F5 or Ctrl+R to refresh
- [ ] Verify: Stay on Driver Dashboard
- [ ] Verify: No redirect to landing page
- [ ] Verify: "Go online" button still visible

### Test 4: Page Refresh (Fresh Driver) ✅
- [ ] Login as fresh driver (+919876543211)
- [ ] Start onboarding (get to any screen)
- [ ] Press F5 or Ctrl+R to refresh
- [ ] Verify: Stay on same onboarding screen
- [ ] Verify: Can continue from where left off

### Test 5: Switch Between Drivers ✅
- [ ] Login as verified driver
- [ ] Go to Driver Dashboard
- [ ] Logout
- [ ] Login as fresh driver
- [ ] Verify: Goes to onboarding
- [ ] Logout
- [ ] Login as verified driver again
- [ ] Verify: Goes to Dashboard again

---

## 🔍 Debugging Tips

### Check Current User:
```javascript
// Browser Console
console.log('User:', JSON.parse(localStorage.getItem('user')));
console.log('Token:', localStorage.getItem('accessToken'));
console.log('Driver Mode:', localStorage.getItem('raahi_driver_mode'));
```

### Check Driver Status API:
```javascript
// Browser Console
fetch('http://localhost:5001/api/driver/onboarding/status', {
  headers: { 
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Driver Status:', data));
```

### Clear Storage for Fresh Test:
```
http://localhost:3000/auto-clear.html
```

---

## 📊 Database Verification

### Check Verified Driver:
```sql
SELECT 
  u.phone, 
  u.firstName, 
  u.lastName,
  d.onboardingStatus,
  d.isVerified,
  d.vehicleNumber,
  d.rating,
  COUNT(dd.id) as document_count
FROM users u
JOIN drivers d ON d."userId" = u.id
LEFT JOIN driver_documents dd ON dd."driverId" = d.id
WHERE u.phone = '+919876543210'
GROUP BY u.id, d.id;
```

Expected Result:
```
phone           | firstName | lastName | onboardingStatus | isVerified | vehicleNumber | rating | document_count
+919876543210  | Verified  | Driver   | COMPLETED       | true       | DL01AB1234    | 4.8    | 4
```

### Check Fresh Driver:
```sql
SELECT 
  u.phone, 
  u.firstName, 
  u.lastName,
  d.onboardingStatus,
  d.isVerified,
  d.vehicleNumber,
  COUNT(dd.id) as document_count
FROM users u
JOIN drivers d ON d."userId" = u.id
LEFT JOIN driver_documents dd ON dd."driverId" = d.id
WHERE u.phone = '+919876543211'
GROUP BY u.id, d.id;
```

Expected Result:
```
phone           | firstName | lastName | onboardingStatus    | isVerified | vehicleNumber | document_count
+919876543211  | Fresh     | Driver   | EMAIL_COLLECTION    | false      | NULL          | 0
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Invalid OTP"
**Solution:** Make sure `NODE_ENV=development` in `raahi-backend/.env`

### Issue 2: Both drivers go to onboarding
**Solution:** Check driver status in database. Verified driver should have:
- `onboardingStatus = 'COMPLETED'`
- `isVerified = true`
- Documents with `isVerified = true`

### Issue 3: Both drivers go to dashboard
**Solution:** Check fresh driver in database. Should have:
- `onboardingStatus = 'EMAIL_COLLECTION'`
- `isVerified = false`
- No documents

### Issue 4: Phone number not accepted
**Solution:** Make sure to include country code: `+91` for India

### Issue 5: API returns 404 "Driver profile not found"
**Solution:** Re-run the setup script:
```bash
./setup-test-drivers.sh
```

---

## 🔄 Re-running Setup

If you need to reset the test drivers:

```bash
./setup-test-drivers.sh
```

This will:
- Delete existing test drivers (if any)
- Clean up all related data (rides, documents, tokens)
- Create fresh test drivers with correct data
- Display success message with credentials

---

## 📱 Complete Test Scenario

### Scenario A: Verified Driver's Daily Flow

```
1. Morning - Open app
   ├─ Click "Open Driver's App"
   ├─ Login: +919876543210 / OTP: 123456
   └─ ✅ Goes to Driver Dashboard

2. Start shift
   ├─ Click "Go online"
   ├─ Status changes to "Online"
   └─ ✅ Can receive ride requests

3. During shift - Refresh browser
   ├─ Press F5
   └─ ✅ Stays on Driver Dashboard

4. End shift
   ├─ Click "Go offline"
   └─ ✅ Status changes to "Offline"
```

### Scenario B: New Driver's Onboarding Journey

```
1. First time - Download app
   ├─ Click "Open Driver's App"
   ├─ Login: +919876543211 / OTP: 123456
   └─ ✅ Goes to Driver Onboarding

2. Complete onboarding
   ├─ Enter email
   ├─ Select language
   ├─ Setup earnings
   ├─ Select vehicle
   ├─ Upload license
   ├─ Upload profile photo
   └─ Upload documents

3. During onboarding - Refresh browser
   ├─ Press F5
   └─ ✅ Stays on same onboarding step

4. After completion
   ├─ Wait for admin verification
   └─ Once verified → Can go online
```

---

## 🎉 Success Criteria

Your implementation is working correctly if:

### Verified Driver:
- ✅ Login takes directly to Driver Dashboard
- ✅ "Go online" button is visible
- ✅ No onboarding screens shown
- ✅ Page refresh stays on Dashboard
- ✅ Toast shows "Welcome back!"

### Fresh Driver:
- ✅ Login takes to Driver Onboarding
- ✅ Email collection screen shown first
- ✅ Can complete onboarding steps
- ✅ Page refresh stays on same step
- ✅ Toast shows "Driver login successful!"

### General:
- ✅ No errors in browser console
- ✅ No errors in backend logs
- ✅ Smooth navigation between screens
- ✅ Clear toast notifications
- ✅ Professional user experience

---

## 📞 Quick Reference

### Test Credentials:

| Type | Phone | OTP | Expected Screen |
|------|-------|-----|----------------|
| Verified Driver | +919876543210 | 123456 | Driver Dashboard |
| Fresh Driver | +919876543211 | 123456 | Driver Onboarding |

### Useful URLs:

| Purpose | URL |
|---------|-----|
| Main App | http://localhost:3000 |
| Clear Storage | http://localhost:3000/auto-clear.html |
| Backend Health | http://localhost:5001/health |
| Admin Panel | http://localhost:3000?admin=true |

### Useful Commands:

| Purpose | Command |
|---------|---------|
| Setup Test Drivers | `./setup-test-drivers.sh` |
| Start Frontend | `npm run dev` |
| Start Backend | `cd raahi-backend && npm run dev` |
| Check Backend Logs | `cd raahi-backend && tail -f logs/app.log` |

---

**Happy Testing! 🚀**

**Last Updated:** October 15, 2025, 3:00 AM



