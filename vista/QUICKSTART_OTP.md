# ⚡ Quick Start - Twilio OTP Login

## 🎯 You Have Two Options

### Option 1: Test Without Twilio (Fastest - 1 Minute)

Perfect for development! OTPs will be printed in the backend console.

```bash
# 1. Start backend (if not running)
cd raahi-backend
npm run dev

# 2. In another terminal, start frontend (if not running)
cd ..
npm run dev

# 3. Test the flow
# - Go to http://localhost:3000/auto-clear.html
# - Click "Find a Ride Now"
# - Click "Login with Mobile OTP"
# - Enter any phone number
# - Check backend console for OTP (it will show: "OTP for +91XXXXX: 123456")
# - Enter the OTP
# - You're logged in! 🎉
```

**Backend will show:**
```
[2025-10-15 12:55:00] INFO: OTP for +919876543210: 654321
[2025-10-15 12:55:00] INFO: OTP sent successfully (development mode)
```

---

### Option 2: Use Real Twilio SMS (5 Minutes)

Get actual SMS messages with OTPs!

#### Step 1: Run Setup Script
```bash
./setup-twilio.sh
```

The script will:
- ✅ Guide you to get Twilio credentials
- ✅ Update your `.env` file automatically
- ✅ Validate your inputs
- ✅ Show you next steps

#### Step 2: Get Twilio Credentials

1. **Sign up:** https://www.twilio.com/try-twilio
   - Free trial includes $15 credit
   - Perfect for testing!

2. **Get credentials:** https://console.twilio.com/
   - Copy **Account SID** (starts with AC...)
   - Copy **Auth Token**
   - Copy **Phone Number** from "Phone Numbers" section

3. **Enter in setup script** when prompted

#### Step 3: Start Backend
```bash
cd raahi-backend
npm run dev
```

You should see:
```
✅ Server running on port 5001
✅ Database connected
✅ Twilio configured
```

#### Step 4: Test!
```bash
# Option A: Use the frontend
http://localhost:3000/auto-clear.html

# Option B: Use the test script
./test-otp.sh
```

---

## 🧪 Test Script Usage

```bash
./test-otp.sh
```

This will:
1. Check if backend is running
2. Ask for your phone number
3. Send OTP via Twilio
4. Ask you to enter the OTP
5. Verify and show success message + auth tokens

---

## 📱 Complete User Flow

```
User Journey:
┌─────────────────────────────────────────┐
│ 1. Dashboard (Not Logged In)           │
│    - Click "Find a Ride Now"            │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 2. Login Screen                         │
│    - Click "Login with Mobile OTP"      │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 3. Mobile Number Screen                 │
│    - Enter: +91 9876543210              │
│    - Click "Continue"                   │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 4. Backend Sends OTP                    │
│    📱 User receives SMS:                │
│    "Your Raahi verification code is:    │
│     123456. Valid for 5 minutes."       │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 5. OTP Verification Screen              │
│    - Enter: 123456                      │
│    - Click "Verify"                     │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 6. Dashboard (Logged In)                │
│    ✅ User button with phone            │
│    ✅ Red logout button                 │
│    ✅ Can book rides                    │
└─────────────────────────────────────────┘
```

---

## 🔧 API Endpoints (For Testing)

### Send OTP
```bash
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","countryCode":"+91"}'
```

### Verify OTP
```bash
curl -X POST http://localhost:5001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","otp":"123456","countryCode":"+91"}'
```

---

## 📋 Checklist

### Development Mode (No Twilio):
- [ ] Backend running on port 5001
- [ ] Frontend running on port 3000
- [ ] Can click "Login with Mobile OTP"
- [ ] Phone number input works
- [ ] Backend console shows OTP
- [ ] OTP verification works
- [ ] User logged in successfully

### Production Mode (With Twilio):
- [ ] Twilio account created
- [ ] Credentials added to `.env`
- [ ] Backend restarted
- [ ] SMS received on phone
- [ ] OTP verification works
- [ ] User logged in successfully

---

## 💡 Quick Tips

### Development Mode:
```bash
# The OTP is ALWAYS printed in the backend console
# Look for this line:
[INFO] OTP for +919876543210: 123456

# You can use ANY 6-digit number as OTP
# Examples: 123456, 000000, 999999
```

### Twilio Free Tier:
```bash
# For FREE trials, you can only send to verified numbers
# Add numbers at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
# Click: "+" to add your phone number
# Verify it with SMS
# Then you can test OTP login!
```

### Troubleshooting:
```bash
# Backend not starting?
cd raahi-backend
npm install
npm run dev

# Frontend not working?
cd ..
npm install
npm run dev

# OTP not received?
# 1. Check backend logs
# 2. Verify Twilio credentials
# 3. For free tier, verify recipient number in Twilio console
```

---

## 📞 Support Resources

- **Full Documentation:** `TWILIO_OTP_SETUP.md`
- **Twilio Docs:** https://www.twilio.com/docs/sms
- **Test Script:** `./test-otp.sh`
- **Setup Script:** `./setup-twilio.sh`

---

## 🎉 That's It!

**With Development Mode:** Ready in 1 minute!  
**With Twilio:** Ready in 5 minutes!  

Both work perfectly for testing your OTP login flow.

---

**Happy Testing! 🚀**



