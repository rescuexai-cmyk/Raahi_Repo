/**
 * Setup Test Drivers
 * 
 * Creates two test drivers for testing driver login functionality:
 * 1. Verified Driver (+919876543210) - Goes to driver dashboard
 * 2. Fresh Driver (+919876543211) - Goes to driver onboarding
 */

import { PrismaClient, OnboardingStatus, DocumentType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function cleanupExistingDriver(phone: string) {
  const existingUser = await prisma.user.findUnique({
    where: { phone },
    include: { 
      driverProfile: {
        include: {
          documents: true,
          rides: true,
          earnings: true
        }
      },
      rides: true,
      refreshTokens: true,
      notifications: true
    }
  });

  if (existingUser) {
    console.log(`⚠️  User with phone ${phone} already exists, cleaning up...`);
    
    // Delete related records first
    if (existingUser.driverProfile) {
      // Delete driver documents
      await prisma.driverDocument.deleteMany({
        where: { driverId: existingUser.driverProfile.id }
      });
      
      // Delete driver earnings
      await prisma.driverEarning.deleteMany({
        where: { driverId: existingUser.driverProfile.id }
      });
      
      // Delete driver rides
      await prisma.ride.deleteMany({
        where: { driverId: existingUser.driverProfile.id }
      });
    }
    
    // Delete passenger rides
    await prisma.ride.deleteMany({
      where: { passengerId: existingUser.id }
    });
    
    // Delete refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: existingUser.id }
    });
    
    // Delete notifications
    await prisma.notification.deleteMany({
      where: { userId: existingUser.id }
    });
    
    // Finally delete the user (cascade will handle driver profile)
    await prisma.user.delete({ 
      where: { id: existingUser.id } 
    });
    
    console.log(`✅ Cleaned up existing user`);
  }
}

async function main() {
  console.log('🚀 Setting up test drivers...\n');

  // ============================================================================
  // 1. VERIFIED DRIVER - Complete onboarding, all documents verified
  // ============================================================================
  
  console.log('📝 Creating Verified Driver...');
  console.log('Phone: +919876543210');
  console.log('OTP: Any 6-digit code (in development mode)');
  
  // Cleanup existing driver
  await cleanupExistingDriver('+919876543210');

  // Create verified driver user
  const verifiedUser = await prisma.user.create({
    data: {
      phone: '+919876543210',
      email: 'verified.driver@raahi.com',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      isVerified: true,
      isActive: true,
    }
  });

  console.log(`✅ User created: ${verifiedUser.id}`);

  // Create driver profile with completed onboarding
  const verifiedDriver = await prisma.driver.create({
    data: {
      userId: verifiedUser.id,
      licenseNumber: 'DL1234567890',
      licenseExpiry: new Date('2030-12-31'),
      vehicleNumber: 'DL01AB1234',
      vehicleModel: 'Honda City',
      vehicleColor: 'Silver',
      vehicleYear: 2022,
      vehicleType: 'sedan',
      isVerified: true,
      isActive: true,
      isOnline: false,
      onboardingStatus: OnboardingStatus.COMPLETED,
      preferredLanguage: 'english',
      serviceTypes: ['raahi_driver'],
      documentsSubmittedAt: new Date(),
      documentsVerifiedAt: new Date(),
      verificationNotes: 'Test driver - all documents verified',
      rating: 4.8,
      totalRides: 250,
      totalEarnings: 125000,
    }
  });

  console.log(`✅ Driver profile created: ${verifiedDriver.id}`);

  // Create verified documents
  const documentTypes: DocumentType[] = [
    DocumentType.LICENSE,
    DocumentType.RC,
    DocumentType.INSURANCE,
    DocumentType.PROFILE_PHOTO
  ];

  for (const docType of documentTypes) {
    await prisma.driverDocument.create({
      data: {
        driverId: verifiedDriver.id,
        documentType: docType,
        documentUrl: `/test/documents/${docType.toLowerCase()}.pdf`,
        documentName: `${docType}.pdf`,
        documentSize: 1024000,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: 'admin-test',
      }
    });
  }

  console.log(`✅ Created ${documentTypes.length} verified documents`);
  console.log('✅ VERIFIED DRIVER READY!\n');

  // ============================================================================
  // 2. FRESH DRIVER - Just starting onboarding
  // ============================================================================
  
  console.log('📝 Creating Fresh Driver...');
  console.log('Phone: +919876543211');
  console.log('OTP: Any 6-digit code (in development mode)');
  
  // Cleanup existing driver
  await cleanupExistingDriver('+919876543211');

  // Create fresh driver user
  const freshUser = await prisma.user.create({
    data: {
      phone: '+919876543211',
      email: 'fresh.driver@raahi.com',
      firstName: 'Amit',
      lastName: 'Sharma',
      isVerified: false,
      isActive: true,
    }
  });

  console.log(`✅ User created: ${freshUser.id}`);

  // Create driver profile with EMAIL_COLLECTION status (just started)
  const freshDriver = await prisma.driver.create({
    data: {
      userId: freshUser.id,
      isVerified: false,
      isActive: true,
      isOnline: false,
      onboardingStatus: OnboardingStatus.EMAIL_COLLECTION,
      rating: 0.0,
      totalRides: 0,
      totalEarnings: 0,
    }
  });

  console.log(`✅ Driver profile created: ${freshDriver.id}`);
  console.log('✅ FRESH DRIVER READY!\n');

  // ============================================================================
  // Summary
  // ============================================================================
  
  console.log('========================================');
  console.log('📋 TEST DRIVERS SETUP COMPLETE!');
  console.log('========================================\n');

  console.log('🚗 VERIFIED DRIVER (Go to Driver Dashboard)');
  console.log('   Name: Rajesh Kumar');
  console.log('   Phone: +919876543210');
  console.log('   Email: verified.driver@raahi.com');
  console.log('   OTP: Any 6-digit code (e.g., 123456)');
  console.log('   Status: COMPLETED');
  console.log('   Documents: All verified ✅');
  console.log('   Expected: Goes to "Go online" page\n');

  console.log('🆕 FRESH DRIVER (Go to Driver Onboarding)');
  console.log('   Name: Amit Sharma');
  console.log('   Phone: +919876543211');
  console.log('   Email: fresh.driver@raahi.com');
  console.log('   OTP: Any 6-digit code (e.g., 123456)');
  console.log('   Status: EMAIL_COLLECTION');
  console.log('   Documents: None');
  console.log('   Expected: Goes to driver onboarding page\n');

  console.log('========================================');
  console.log('🧪 HOW TO TEST:');
  console.log('========================================\n');

  console.log('1. Go to http://localhost:3000');
  console.log('2. Click "Open Driver\'s App"');
  console.log('3. Login with Mobile OTP:');
  console.log('   - Enter phone number (with country code)');
  console.log('   - Enter any 6-digit OTP (development mode)');
  console.log('4. Should route based on driver status!\n');

  console.log('💡 TIP: Set NODE_ENV=development in raahi-backend/.env');
  console.log('   This allows any OTP to work for testing.\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

