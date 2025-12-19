# 🚗 Quick Driver Test Reference

## ✅ Test Drivers Ready!

---

## 📱 Test Credentials

### 🚗 Verified Driver (Goes to Dashboard)
```
Phone: +919876543210
OTP: 123456
Expected: Driver Dashboard with "Go online" button ✅
```

### 🆕 Fresh Driver (Goes to Onboarding)
```
Phone: +919876543211
OTP: 123456
Expected: Driver Onboarding (Email Collection) ✅
```

---

## 🧪 Quick Test Steps

### Test 1: Verified Driver
```
1. http://localhost:3000
2. Click "Open Driver's App"
3. Login with Mobile OTP
4. Phone: +919876543210
5. OTP: 123456
6. ✅ Should see: Driver Dashboard
```

### Test 2: Fresh Driver
```
1. http://localhost:3000
2. Click "Open Driver's App"
3. Login with Mobile OTP
4. Phone: +919876543211
5. OTP: 123456
6. ✅ Should see: Driver Onboarding
```

---

## 🔄 Reset Test Data

```bash
./setup-test-drivers.sh
```

---

## 🔗 Quick Links

- **App:** http://localhost:3000
- **Clear Storage:** http://localhost:3000/auto-clear.html
- **Backend:** http://localhost:5001/health
- **Full Guide:** [DRIVER_LOGIN_TEST_GUIDE.md](./DRIVER_LOGIN_TEST_GUIDE.md)

---

**Both test drivers are ready to use! Start testing! 🎉**



