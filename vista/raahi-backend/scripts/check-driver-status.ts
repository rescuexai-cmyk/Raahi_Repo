import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDriverStatus() {
  console.log('🔍 Checking driver status...\n');

  try {
    // Check fresh driver (+919876543211)
    const freshDriver = await prisma.user.findUnique({
      where: { phone: '+919876543211' },
      include: {
        driverProfile: {
          include: {
            documents: true
          }
        }
      }
    });

    if (freshDriver && freshDriver.driverProfile) {
      console.log('🆕 FRESH DRIVER (+919876543211):');
      console.log('   Name:', `${freshDriver.firstName} ${freshDriver.lastName}`);
      console.log('   Email:', freshDriver.email);
      console.log('   Onboarding Status:', freshDriver.driverProfile.onboardingStatus);
      console.log('   Is Verified:', freshDriver.driverProfile.isVerified);
      console.log('   Documents Submitted At:', freshDriver.driverProfile.documentsSubmittedAt);
      console.log('   Documents Verified At:', freshDriver.driverProfile.documentsVerifiedAt);
      console.log('\n   📄 UPLOADED DOCUMENTS:');
      
      if (freshDriver.driverProfile.documents.length === 0) {
        console.log('   ❌ No documents uploaded');
      } else {
        freshDriver.driverProfile.documents.forEach((doc, index) => {
          console.log(`   ${index + 1}. ${doc.documentType} - ${doc.isVerified ? '✅ Verified' : '⏳ Pending'}`);
          console.log(`      Uploaded: ${doc.uploadedAt}`);
          console.log(`      File: ${doc.documentName || doc.documentUrl}`);
        });
      }
      
      // Check what documents are missing
      const requiredDocs = ['LICENSE', 'PAN_CARD', 'RC', 'AADHAAR_CARD', 'PROFILE_PHOTO'];
      const uploadedDocTypes = freshDriver.driverProfile.documents.map(d => d.documentType as string);
      const missingDocs = requiredDocs.filter(doc => !uploadedDocTypes.includes(doc));
      
      if (missingDocs.length > 0) {
        console.log('\n   ⚠️  MISSING DOCUMENTS:', missingDocs.join(', '));
      } else {
        console.log('\n   ✅ All required documents uploaded!');
      }
    } else {
      console.log('❌ Fresh driver not found');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Check verified driver (+919876543210)
    const verifiedDriver = await prisma.user.findUnique({
      where: { phone: '+919876543210' },
      include: {
        driverProfile: {
          include: {
            documents: true
          }
        }
      }
    });

    if (verifiedDriver && verifiedDriver.driverProfile) {
      console.log('🚗 VERIFIED DRIVER (+919876543210):');
      console.log('   Name:', `${verifiedDriver.firstName} ${verifiedDriver.lastName}`);
      console.log('   Email:', verifiedDriver.email);
      console.log('   Onboarding Status:', verifiedDriver.driverProfile.onboardingStatus);
      console.log('   Is Verified:', verifiedDriver.driverProfile.isVerified);
      console.log('   Documents Submitted At:', verifiedDriver.driverProfile.documentsSubmittedAt);
      console.log('   Documents Verified At:', verifiedDriver.driverProfile.documentsVerifiedAt);
      console.log('\n   📄 UPLOADED DOCUMENTS:');
      
      if (verifiedDriver.driverProfile.documents.length === 0) {
        console.log('   ❌ No documents uploaded');
      } else {
        verifiedDriver.driverProfile.documents.forEach((doc, index) => {
          console.log(`   ${index + 1}. ${doc.documentType} - ${doc.isVerified ? '✅ Verified' : '⏳ Pending'}`);
        });
      }
    } else {
      console.log('❌ Verified driver not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDriverStatus();

