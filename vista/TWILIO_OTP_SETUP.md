# 🔐 Twilio OTP Authentication Setup Guide

## 🎯 Overview

Your Raahi app already has **complete Twilio OTP implementation** in the backend! You just need to configure it.

## ✅ What's Already Implemented

### Backend (`raahi-backend/`):
- ✅ `/api/auth/send-otp` - Sends OTP via Twilio SMS
- ✅ `/api/auth/verify-otp` - Verifies OTP and authenticates user
- ✅ OTP storage in Redis (5-minute expiry)
- ✅ Automatic user creation on first login
- ✅ JWT token generation
- ✅ Development mode (works without Twilio for testing)

### Frontend:
- ✅ Mobile Number Screen
- ✅ OTP Verification Screen
- ✅ Integration with AuthContext
- ✅ Error handling and loading states

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Get Twilio Credentials

1. **Sign up for Twilio:** https://www.twilio.com/try-twilio
   - Free trial gives you $15 credit
   - Can send SMS to verified numbers

2. **Get your credentials:**
   - Go to: https://console.twilio.com/
   - Copy these values:
     - **Account SID**
     - **Auth Token**
     - **Phone Number** (from "Phone Numbers" section)

### Step 2: Configure Backend

Create `.env` file in `raahi-backend/`:

```bash
cd raahi-backend
cp env.example .env
```

Edit `.env` and add your Twilio credentials:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_PHONE_NUMBER="+12345678900"

# Other required settings
DATABASE_URL="postgresql://username:password@localhost:5432/raahi_db"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_SECRET="your-refresh-token-secret-change-this"
REFRESH_TOKEN_EXPIRES_IN="30d"
PORT=5001
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"
```

### Step 3: Install Dependencies (if not done)

```bash
cd raahi-backend
npm install
```

### Step 4: Start Backend Server

```bash
cd raahi-backend
npm run dev
```

You should see:
```
✅ Server running on port 5001
✅ Database connected
✅ Redis connected (if configured)
```

### Step 5: Test OTP Flow

1. Go to: `http://localhost:3000/auto-clear.html` to clear storage
2. Click "Find a Ride Now!"
3. Click "Login with Mobile OTP"
4. Enter your phone number
5. You'll receive an SMS with 6-digit OTP
6. Enter OTP and you're logged in! 🎉

---

## 🧪 Testing Without Twilio (Development Mode)

If you don't have Twilio configured yet, the system works in **development mode**:

### How it works:
1. When you request OTP, it's **printed in the backend console**
2. Check the terminal running `npm run dev`
3. You'll see: `OTP for +919876543210: 123456`
4. Enter this OTP in the frontend

### Example:
```bash
# Backend terminal will show:
[2025-10-15 12:52:00] INFO: OTP for +919876543210: 654321
[2025-10-15 12:52:00] INFO: OTP sent successfully (development mode)
```

---

## 📋 API Endpoints

### 1. Send OTP

**Endpoint:** `POST /api/auth/send-otp`

**Request:**
```json
{
  "phone": "9876543210",
  "countryCode": "+91"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### 2. Verify OTP

**Endpoint:** `POST /api/auth/verify-otp`

**Request:**
```json
{
  "phone": "9876543210",
  "otp": "123456",
  "countryCode": "+91"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "user": {
      "id": "user-id",
      "phone": "+919876543210",
      "email": "user@example.com",
      "firstName": "John",
      "isVerified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 604800
    }
  }
}
```

---

## 🔧 Frontend Configuration

The frontend is already configured! Check these files:

### `src/services/authService.ts`
```typescript
async sendOTP(phone: string, countryCode: string = '+91'): Promise<void> {
  const response = await authAPI.sendOTP(phone, countryCode);
  if (!response.success) {
    throw new Error(response.message || 'Failed to send OTP');
  }
}
```

### `src/services/api.ts`
Make sure the API base URL is correct:
```typescript
const API_BASE_URL = 'http://localhost:5001/api';
```

---

## 🎨 User Flow

```
1. User clicks "Find a Ride Now"
   ↓
2. Redirected to Login Screen
   ↓
3. Clicks "Login with Mobile OTP"
   ↓
4. Mobile Number Screen
   - Enter phone number
   - Select country code
   - Click "Continue"
   ↓
5. Backend sends OTP via Twilio
   ↓
6. OTP Verification Screen
   - User receives SMS with 6-digit code
   - Enters OTP
   - Click "Verify"
   ↓
7. Backend verifies OTP
   ↓
8. User logged in!
   - JWT tokens stored
   - Redirected to Dashboard
   - User button appears with phone/email
```

---

## 📱 SMS Message Format

When Twilio sends the OTP, users receive:

```
Your Raahi verification code is: 123456. Valid for 5 minutes.
```

---

## 🔒 Security Features

### ✅ OTP Expiry
- OTPs expire after **5 minutes**
- Stored in Redis with TTL (Time To Live)
- Cannot be reused after expiry

### ✅ One-Time Use
- After successful verification, OTP is deleted from cache
- Same OTP cannot be used twice

### ✅ Rate Limiting
- Prevents OTP spam
- Configurable via `RATE_LIMIT_MAX_REQUESTS` in `.env`

### ✅ Phone Number Validation
- Validates phone number format
- Supports international numbers
- Country code required

### ✅ JWT Tokens
- Access Token: 7 days
- Refresh Token: 30 days
- Secure HTTP-only cookies (recommended for production)

---

## 🐛 Troubleshooting

### Problem: "Failed to send OTP"

**Solutions:**
1. Check Twilio credentials in `.env`
2. Verify phone number format: `+[country code][number]`
3. For free accounts, verify the recipient number in Twilio console
4. Check backend logs: `cd raahi-backend && npm run dev`

### Problem: "Invalid OTP"

**Solutions:**
1. Check OTP hasn't expired (5 minutes)
2. In development mode, check backend console for OTP
3. Ensure you're using the latest OTP (if resent)
4. Verify Redis is running (for production)

### Problem: Backend not connecting to Twilio

**Solutions:**
1. Verify environment variables are loaded:
   ```bash
   cd raahi-backend
   node -e "require('dotenv').config(); console.log(process.env.TWILIO_ACCOUNT_SID)"
   ```
2. Check Twilio account status: https://console.twilio.com/
3. For free trials, verify recipient phone numbers

### Problem: Redis connection error

**Solutions:**
1. Install Redis:
   ```bash
   # Mac
   brew install redis
   brew services start redis
   
   # Ubuntu
   sudo apt-get install redis-server
   sudo systemctl start redis
   ```
2. Or use development mode (OTP stored in memory)

---

## 💡 Tips

### For Development:
- Use **development mode** to test without Twilio
- OTPs are printed in backend console
- Any 6-digit number works as OTP

### For Production:
1. Set `NODE_ENV=production` in `.env`
2. Configure Twilio with proper credentials
3. Set up Redis for OTP storage
4. Enable rate limiting
5. Use HTTPS for API calls
6. Store tokens securely (HTTP-only cookies)

### Free Tier Limitations:
- **Twilio Free Trial:**
  - $15 credit
  - Can only send to verified numbers
  - Add numbers at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
  
- **To remove limitations:**
  - Upgrade Twilio account
  - Pay-as-you-go pricing: ~$0.0075 per SMS

---

## 🎉 Testing Checklist

- [ ] Backend server running on port 5001
- [ ] Frontend server running on port 3000
- [ ] Twilio credentials configured (or using dev mode)
- [ ] Can click "Login with Mobile OTP"
- [ ] Phone number entry works
- [ ] OTP sent successfully
- [ ] OTP verification works
- [ ] User logged in after verification
- [ ] User button shows at top
- [ ] Logout button works
- [ ] Can access ride booking after login

---

## 📞 Support

### Twilio Documentation:
- SMS API: https://www.twilio.com/docs/sms
- Node.js SDK: https://www.twilio.com/docs/libraries/node

### Raahi Backend API:
- Swagger UI: `http://localhost:5001/api-docs` (if configured)
- Health Check: `http://localhost:5001/health`

---

**Status:** ✅ **READY TO USE**  
**Backend:** Fully implemented with Twilio  
**Frontend:** Fully integrated  
**Setup Time:** ~5 minutes with Twilio account  
**Last Updated:** October 15, 2025, 12:55 AM



