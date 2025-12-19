# 🚀 Ride Hailing App - Setup & Installation Guide

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Project Installation](#project-installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Development Tools](#development-tools)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

---

## ✅ Prerequisites

### **📱 Mobile Development**
- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Expo CLI** - `npm install -g @expo/cli`
- **EAS CLI** - `npm install -g @expo/eas-cli`

### **📱 Platform-Specific Requirements**

#### **🍎 iOS Development (macOS only)**
- **Xcode** (latest version) - [Download from App Store](https://apps.apple.com/app/xcode/id497799835)
- **iOS Simulator** (included with Xcode)
- **CocoaPods** - `sudo gem install cocoapods`

#### **🤖 Android Development**
- **Android Studio** - [Download](https://developer.android.com/studio)
- **Android SDK** (API level 21 or higher)
- **Android Emulator** or physical Android device
- **Java Development Kit (JDK)** 11 or higher

### **🗄️ Database Requirements**
- **PostgreSQL** (v14.0 or higher) - [Download](https://www.postgresql.org/download/)
- **PostGIS Extension** (v3.2 or higher)
- **Redis** (v7.0 or higher) - [Download](https://redis.io/download)

### **🔧 Development Tools**
- **Git** - [Download](https://git-scm.com/)
- **Visual Studio Code** (recommended) - [Download](https://code.visualstudio.com/)
- **Postman** or **Insomnia** for API testing

---

## 🌍 Environment Setup

### **1. Install Node.js and npm**
```bash
# Verify Node.js installation
node --version  # Should be v18.0.0+
npm --version   # Should be 8.0.0+

# If using nvm (recommended)
nvm install 18
nvm use 18
```

### **2. Install Global Dependencies**
```bash
# Install Expo CLI
npm install -g @expo/cli

# Install EAS CLI for builds
npm install -g @expo/eas-cli

# Install TypeScript globally (optional)
npm install -g typescript

# Verify installations
expo --version
eas --version
```

### **3. Setup Development Environment**
```bash
# Create workspace directory
mkdir ~/RideHailingWorkspace
cd ~/RideHailingWorkspace

# Clone the repository
git clone <your-repository-url> RideHailingApp
cd RideHailingApp
```

---

## 🗄️ Database Setup

### **1. Install PostgreSQL with PostGIS**

#### **🍎 macOS (using Homebrew)**
```bash
# Install PostgreSQL
brew install postgresql@14

# Install PostGIS
brew install postgis

# Start PostgreSQL service
brew services start postgresql@14
```

#### **🐧 Ubuntu/Debian**
```bash
# Update package list
sudo apt update

# Install PostgreSQL and PostGIS
sudo apt install postgresql-14 postgresql-14-postgis-3
sudo apt install postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### **🪟 Windows**
```bash
# Download and install PostgreSQL from official website
# Include PostGIS in the installation

# Or use Chocolatey
choco install postgresql --params '/Password:yourpassword'
choco install postgis
```

### **2. Create Database and User**
```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Or on Windows/macOS
psql -U postgres
```

```sql
-- Create database
CREATE DATABASE ridehailing;

-- Create user with password
CREATE USER ridehailing_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ridehailing TO ridehailing_user;

-- Connect to the database
\c ridehailing

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verify PostGIS installation
SELECT PostGIS_Version();

-- Exit psql
\q
```

### **3. Install and Setup Redis**

#### **🍎 macOS**
```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Test Redis connection
redis-cli ping  # Should return PONG
```

#### **🐧 Ubuntu/Debian**
```bash
# Install Redis
sudo apt install redis-server

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis connection
redis-cli ping  # Should return PONG
```

#### **🪟 Windows**
```bash
# Download Redis from official website or use WSL
# Or use Chocolatey
choco install redis-64

# Start Redis service
redis-server
```

---

## 📦 Project Installation

### **1. Install Dependencies**
```bash
# Navigate to project directory
cd RideHailingApp

# Install npm dependencies
npm install

# Install iOS dependencies (macOS only)
cd ios && pod install && cd ..

# Verify installation
npm list --depth=0
```

### **2. Install Development Dependencies**
```bash
# Install additional dev dependencies
npm install --save-dev @types/node @types/jest

# Install global tools
npm install -g react-native-debugger
```

---

## ⚙️ Configuration

### **1. Environment Variables**
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env  # or use your preferred editor
```

### **2. Configure `.env` file**
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ridehailing
DB_USER=ridehailing_user
DB_PASSWORD=your_secure_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Leave empty for local development

# JWT Configuration
EXPO_PUBLIC_JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# WebSocket Configuration
EXPO_PUBLIC_WEBSOCKET_URL=ws://localhost:3001

# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# Razorpay Configuration (for payments)
EXPO_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Push Notifications (optional)
EXPO_PROJECT_ID=your-expo-project-id

# Google Maps API (for production)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# SMS Service Configuration (for OTP)
SMS_SERVICE_API_KEY=your_sms_service_api_key
SMS_SERVICE_SENDER_ID=your_sender_id
```

### **3. Configure app.json**
```json
{
  "expo": {
    "name": "Ride Hailing App",
    "slug": "ride-hailing-app",
    "version": "1.0.0",
    "platforms": ["ios", "android"],
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "cover"
    },
    "plugins": [
      "expo-location",
      "expo-notifications",
      [
        "expo-build-properties",
        {
          "android": {
            "enableProguardInReleaseBuilds": true
          }
        }
      ]
    ],
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE"
      ]
    },
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "This app needs location access to show nearby drivers and track rides.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "This app needs location access to track rides and show real-time updates."
      }
    }
  }
}
```

---

## 🚀 Running the Application

### **1. Initialize Database**
```bash
# Run database initialization script
npm run init-db

# Or manually run the SQL scripts
psql -U ridehailing_user -d ridehailing -f database/init.sql
```

### **2. Start Backend Services**

#### **Start WebSocket Server**
```bash
# Navigate to WebSocket server directory
cd websocket-server

# Install dependencies
npm install

# Start WebSocket server
npm start

# Server should start on http://localhost:3001
```

#### **Start API Server (if separate)**
```bash
# Navigate to API server directory
cd api-server

# Install dependencies
npm install

# Start API server
npm start

# Server should start on http://localhost:3000
```

### **3. Start Mobile App**

#### **🏠 Development Mode**
```bash
# Start Expo development server
npm start

# Or use specific platform
npm run ios      # Start iOS simulator
npm run android  # Start Android emulator
npm run web      # Start web version
```

#### **📱 On Physical Device**
```bash
# Install Expo Go app on your device
# iOS: App Store
# Android: Google Play Store

# Scan QR code from terminal or Expo Dev Tools
# Or use: 
expo start --tunnel  # For external network access
```

### **4. Verify Installation**
After starting all services, verify:

- ✅ **PostgreSQL**: Database accessible on localhost:5432
- ✅ **Redis**: Cache accessible on localhost:6379  
- ✅ **WebSocket**: Server running on localhost:3001
- ✅ **Mobile App**: Expo running on localhost:19000
- ✅ **Database**: Tables created with PostGIS extension
- ✅ **Authentication**: OTP service functional

---

## 🛠️ Development Tools

### **1. Database Management**
```bash
# Install pgAdmin (GUI for PostgreSQL)
# Download from https://www.pgadmin.org/

# Or use command line tools
psql -U ridehailing_user -d ridehailing

# Redis CLI
redis-cli
```

### **2. Code Editor Setup (VS Code)**
```bash
# Install recommended extensions
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-json
code --install-extension redhat.vscode-yaml
code --install-extension ms-python.python
```

### **3. Debugging Tools**
```bash
# Install React Native Debugger
brew install --cask react-native-debugger

# Or download from GitHub releases
# https://github.com/jhen0409/react-native-debugger
```

### **4. Testing Setup**
```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react-native

# Run tests
npm test
```

---

## 🐛 Troubleshooting

### **Common Issues and Solutions**

#### **🔧 Node.js/npm Issues**
```bash
# Clear npm cache
npm cache clean --force

# Update npm
npm install -g npm@latest

# Fix permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm
```

#### **📱 Expo/React Native Issues**
```bash
# Clear Expo cache
expo r -c

# Reset Metro bundler
expo start --clear

# Fix iOS pods (macOS only)
cd ios && pod deintegrate && pod install && cd ..
```

#### **🗄️ Database Issues**
```bash
# Reset PostgreSQL password
sudo -u postgres psql
ALTER USER postgres PASSWORD 'newpassword';

# Check PostgreSQL service
sudo systemctl status postgresql

# Check Redis service
redis-cli ping
```

#### **🔌 WebSocket Connection Issues**
```bash
# Check if port is in use
lsof -i :3001

# Kill process using port
kill -9 <PID>

# Check firewall settings (allow port 3001)
```

#### **📍 Location Permission Issues**
```bash
# iOS Simulator
# Device > Location > Custom Location

# Android Emulator  
# Extended Controls > Location
```

### **🚨 Error Code References**

| Error Code | Description | Solution |
|------------|-------------|----------|
| `EADDRINUSE` | Port already in use | Change port or kill existing process |
| `ECONNREFUSED` | Database connection refused | Check database service and credentials |
| `MODULE_NOT_FOUND` | Missing dependencies | Run `npm install` |
| `Permission denied` | File/folder permissions | Fix with `chmod` or `chown` |

---

## 🌐 Production Deployment

### **1. Environment Preparation**
```bash
# Build for production
expo build:android  # or expo build:ios

# Or use EAS Build
eas build --platform android
eas build --platform ios
```

### **2. Database Migration**
```bash
# Export development data
pg_dump -U ridehailing_user ridehailing > backup.sql

# Import to production
psql -U production_user production_db < backup.sql
```

### **3. Docker Deployment (Optional)**
```dockerfile
# Dockerfile example
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

### **4. Environment Variables (Production)**
```bash
# Production .env
NODE_ENV=production
DB_HOST=your-production-db-host
DB_SSL=true
REDIS_URL=redis://your-redis-url
JWT_SECRET=your-production-jwt-secret
```

---

## 📞 Support & Resources

### **📖 Documentation**
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)

### **🆘 Getting Help**
- **GitHub Issues**: Create an issue in the repository
- **Discord/Slack**: Join the development community
- **Stack Overflow**: Tag questions with relevant technologies

### **🔧 Useful Commands**
```bash
# Quick start (after initial setup)
npm run dev:all        # Start all services

# Database operations
npm run db:reset       # Reset database
npm run db:seed        # Seed test data
npm run db:migrate     # Run migrations

# Testing
npm run test           # Run tests
npm run test:watch     # Watch mode
npm run lint           # Check code style

# Building
npm run build:android  # Build Android APK
npm run build:ios      # Build iOS IPA
```

---

## ✅ Final Checklist

Before considering your setup complete, ensure:

- [ ] **Node.js v18+** installed and working
- [ ] **PostgreSQL with PostGIS** running and accessible
- [ ] **Redis** service running
- [ ] **Environment variables** properly configured
- [ ] **Database tables** created successfully
- [ ] **Mobile app** starts without errors
- [ ] **WebSocket server** connecting properly
- [ ] **Location permissions** granted
- [ ] **OTP service** sending test messages
- [ ] **Payment integration** configured (if using)

---

## 🎉 Success!

If you've completed all steps successfully, you should now have:
- 📱 **Mobile app** running on iOS/Android simulator or device
- 🗄️ **PostgreSQL database** with spatial capabilities
- ⚡ **Redis cache** for real-time features
- 🔌 **WebSocket server** for live tracking
- 🔐 **OTP authentication** system
- 💳 **Payment integration** ready

**Happy coding!** 🚀

---

*For additional help or contributions, please refer to the project's GitHub repository or contact the development team.*