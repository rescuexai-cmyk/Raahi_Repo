# Admin Dashboard Setup Guide

## 🎯 Overview

A comprehensive admin dashboard system for managing driver document verification in the Raahi ride-hailing application.

## ✨ Features

### Backend Admin APIs (`/api/admin`)

1. **GET `/api/admin/statistics`**
   - Get dashboard statistics
   - Returns total drivers, verified, pending, rejected
   - Returns document statistics

2. **GET `/api/admin/drivers/pending`**
   - List all drivers pending document verification
   - Supports search, pagination, status filtering
   - Returns detailed driver info with document status

3. **GET `/api/admin/drivers/:driverId`**
   - Get detailed driver information
   - Includes all documents, vehicle info, verification status

4. **POST `/api/admin/documents/:documentId/verify`**
   - Approve or reject a specific document
   - Auto-updates driver status when all docs are verified/rejected
   - Supports rejection reasons

5. **POST `/api/admin/drivers/:driverId/verify-all`**
   - Bulk approve or reject all documents for a driver
   - One-click verification

### Frontend Admin Dashboard

- **Real-time statistics** cards (total, verified, pending, rejected)
- **Driver list** with search and filter capabilities
- **Document viewer** with approval/rejection interface
- **Individual** and **bulk** verification actions
- **Rejection reasons** with admin notes
- **Responsive design** with modern UI

## 📁 Files Created/Modified

### Backend
- ✅ `/raahi-backend/src/routes/admin.ts` (NEW)
- ✅ `/raahi-backend/src/index.ts` (Modified - added admin routes)
- ✅ `/raahi-backend/src/routes/driverOnboarding.ts` (Modified)
- ✅ `/raahi-backend/prisma/schema.prisma` (Modified - added onboarding fields)

### Frontend
- ✅ `/src/services/adminApi.ts` (NEW)
- ✅ `/src/components/AdminDashboardScreen.tsx` (NEW)
- ✅ `/src/App.tsx` (Modified - added admin route)
- ✅ `/src/hooks/useAppState.ts` (Modified - added admin-dashboard screen)
- ✅ `/src/components/driver/DriverDocumentUploadScreen.tsx` (Modified - real API integration)

## 🚀 How to Access

### Option 1: URL Parameter
```
http://localhost:3000/?admin=true
```

### Option 2: Direct Navigation (in code)
```typescript
updateAppState({ currentScreen: 'admin-dashboard' });
```

## 📝 API Usage Examples

### Get Statistics
```bash
curl -X GET "http://localhost:5001/api/admin/statistics" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "drivers": {
      "total": 10,
      "verified": 5,
      "pending_verification": 3,
      "rejected": 2
    },
    "documents": {
      "total": 50,
      "verified": 35,
      "pending": 15
    }
  }
}
```

### Get Pending Drivers
```bash
curl -X GET "http://localhost:5001/api/admin/drivers/pending?limit=10&search=priya" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Approve Document
```bash
curl -X POST "http://localhost:5001/api/admin/documents/DOCUMENT_ID/verify" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true
  }'
```

### Reject Document
```bash
curl -X POST "http://localhost:5001/api/admin/documents/DOCUMENT_ID/verify" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": false,
    "rejection_reason": "Document is blurry. Please re-upload a clear photo."
  }'
```

### Verify All Documents (Bulk)
```bash
curl -X POST "http://localhost:5001/api/admin/drivers/DRIVER_ID/verify-all" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "notes": "All documents verified successfully"
  }'
```

## 🔒 Authentication

Currently using the `authenticate` middleware. In production:
- Replace with `authenticateAdmin` middleware
- Implement role-based access control (RBAC)
- Add admin user management

## 🎨 UI Features

### Statistics Dashboard
- Real-time counts of drivers and documents
- Color-coded status indicators
- Quick overview of verification pipeline

### Driver List
- Search by name, email, phone
- Filter by onboarding status
- Visual status badges
- Quick document summary (✅ ⏳ ❌ counts)

### Document Verification
- View document URLs in new tab
- Individual approve/reject actions
- Bulk approve/reject all
- Rejection reason modal
- Auto-reload after verification

### Responsive Design
- Works on desktop and mobile
- Tailwind CSS styling
- Modern card-based layout
- Loading states and error handling

## 🔄 Verification Workflow

1. **Driver Uploads Documents** → `DOCUMENT_UPLOAD`
2. **Driver Submits for Verification** → `DOCUMENT_VERIFICATION`
3. **Admin Reviews Documents** → Admin Dashboard
4. **Admin Approves/Rejects** → Auto-updates driver status
5. **All Docs Verified** → `COMPLETED` + `can_start_rides: true`
6. **Any Doc Rejected** → `REJECTED` + rejection notes

## 📊 Driver Status Flow

```
EMAIL_COLLECTION
    ↓
LANGUAGE_SELECTION
    ↓
VEHICLE_SELECTION
    ↓
DOCUMENT_UPLOAD
    ↓
DOCUMENT_VERIFICATION (← Admin reviews here)
    ↓
COMPLETED (all approved) or REJECTED (any rejected)
```

## 🐛 Troubleshooting

### Backend Not Starting
```bash
cd /Users/sarthakmishra/Raahi-1.0/raahi-backend
npm run dev
```

### Admin Dashboard Not Loading
- Ensure backend is running on port 5001
- Check browser console for errors
- Verify URL: `http://localhost:3000/?admin=true`

### Documents Not Showing
- Check backend logs: `/tmp/raahi-backend.log`
- Verify documents are in `/raahi-backend/uploads/driver-documents/`
- Ensure `app.use('/uploads', express.static('uploads'));` is in index.ts

## 🚧 Production Considerations

1. **Security**
   - Implement proper admin authentication
   - Add role-based access control
   - Use secure tokens (JWT)
   - Validate file uploads

2. **File Storage**
   - Move to cloud storage (AWS S3, Google Cloud Storage)
   - Implement CDN for document delivery
   - Add document encryption

3. **Performance**
   - Add caching (Redis)
   - Implement pagination properly
   - Optimize database queries
   - Add indexes to database

4. **Monitoring**
   - Add admin activity logs
   - Track verification times
   - Monitor API performance
   - Set up alerts for rejections

## 📞 Support

For issues or questions:
- Check backend logs: `tail -f /tmp/raahi-backend.log`
- Check frontend console: Browser DevTools
- Review API responses for error messages

## ✅ Testing Checklist

- [x] Backend APIs working
- [x] Frontend admin dashboard loading
- [x] Statistics display correctly
- [x] Driver list with search
- [x] Document approval flow
- [x] Document rejection flow
- [x] Bulk verification
- [x] Driver status updates
- [x] Real-time document upload during onboarding

---

**Created**: October 5, 2025  
**Status**: ✅ Fully Functional  
**Backend**: Running on port 5001  
**Frontend**: Running on port 3000  
**Access URL**: `http://localhost:3000/?admin=true`

