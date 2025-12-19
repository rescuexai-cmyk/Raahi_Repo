import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default pricing rule
  const pricingRule = await prisma.pricingRule.upsert({
    where: { id: 'default-pricing' },
    update: {},
    create: {
      id: 'default-pricing',
      name: 'Default Pricing',
      baseFare: 25,
      perKmRate: 12,
      perMinuteRate: 2,
      surgeMultiplier: 1.0,
      peakHourMultiplier: 1.5,
      isActive: true,
      validFrom: new Date(),
    },
  });

  console.log('✅ Created pricing rule:', pricingRule.name);

  // Create surge areas
  const surgeAreas = [
    {
      name: 'Connaught Place',
      centerLatitude: 28.6315,
      centerLongitude: 77.2167,
      radius: 2.0,
      multiplier: 1.5,
    },
    {
      name: 'India Gate',
      centerLatitude: 28.6129,
      centerLongitude: 77.2295,
      radius: 1.5,
      multiplier: 1.3,
    },
    {
      name: 'Delhi Airport',
      centerLatitude: 28.5562,
      centerLongitude: 77.1000,
      radius: 3.0,
      multiplier: 2.0,
    },
  ];

  for (const area of surgeAreas) {
    const surgeArea = await prisma.surgeArea.create({
      data: area,
    });
    console.log('✅ Created surge area:', surgeArea.name);
  }

  // Create test users (both riders and drivers)
  const testUsers = [
    // Riders
    {
      phone: '+919876543210',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      isVerified: true,
    },
    {
      phone: '+919876543211',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      isVerified: true,
    },
    {
      phone: '+919876543212',
      firstName: 'Mike',
      lastName: 'Johnson',
      email: 'mike.johnson@example.com',
      isVerified: true,
    },
    {
      phone: '+919876543213',
      firstName: 'Sarah',
      lastName: 'Wilson',
      email: 'sarah.wilson@example.com',
      isVerified: true,
    },
    // Drivers
    {
      phone: '+919876543214',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      email: 'rajesh.kumar@example.com',
      isVerified: true,
    },
    {
      phone: '+919876543215',
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.sharma@example.com',
      isVerified: true,
    },
    {
      phone: '+919876543216',
      firstName: 'Amit',
      lastName: 'Singh',
      email: 'amit.singh@example.com',
      isVerified: true,
    },
  ];

  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
    console.log('✅ Created/Updated user:', user.firstName);
  }

  // Create test drivers
  const testDrivers = [
    {
      phone: '+919876543214',
      licenseNumber: 'DL123456789',
      vehicleNumber: 'DL01AB1234',
      vehicleModel: 'Maruti Swift',
      vehicleColor: 'White',
      vehicleYear: 2020,
      rating: 4.8,
      totalRides: 150,
      totalEarnings: 25000,
      isOnline: true,
      currentLatitude: 28.6139,
      currentLongitude: 77.2090,
    },
    {
      phone: '+919876543215',
      licenseNumber: 'DL987654321',
      vehicleNumber: 'DL02CD5678',
      vehicleModel: 'Honda City',
      vehicleColor: 'Silver',
      vehicleYear: 2021,
      rating: 4.6,
      totalRides: 120,
      totalEarnings: 22000,
      isOnline: true,
      currentLatitude: 28.5355,
      currentLongitude: 77.3910,
    },
    {
      phone: '+919876543216',
      licenseNumber: 'DL456789123',
      vehicleNumber: 'DL03EF9012',
      vehicleModel: 'Toyota Innova',
      vehicleColor: 'Black',
      vehicleYear: 2019,
      rating: 4.9,
      totalRides: 200,
      totalEarnings: 35000,
      isOnline: false,
      currentLatitude: 28.5562,
      currentLongitude: 77.1000,
    },
  ];

  const createdDrivers = [];
  for (const driverData of testDrivers) {
    const user = await prisma.user.findFirst({ where: { phone: driverData.phone } });
    if (user) {
      const driver = await prisma.driver.upsert({
        where: { vehicleNumber: driverData.vehicleNumber },
        update: {
          rating: driverData.rating,
          totalRides: driverData.totalRides,
          totalEarnings: driverData.totalEarnings,
          isOnline: driverData.isOnline,
          currentLatitude: driverData.currentLatitude,
          currentLongitude: driverData.currentLongitude,
        },
        create: {
          userId: user.id,
          licenseNumber: driverData.licenseNumber,
          licenseExpiry: new Date('2025-12-31'),
          vehicleNumber: driverData.vehicleNumber,
          vehicleModel: driverData.vehicleModel,
          vehicleColor: driverData.vehicleColor,
          vehicleYear: driverData.vehicleYear,
          isVerified: true,
          isActive: true,
          isOnline: driverData.isOnline,
          currentLatitude: driverData.currentLatitude,
          currentLongitude: driverData.currentLongitude,
          rating: driverData.rating,
          totalRides: driverData.totalRides,
          totalEarnings: driverData.totalEarnings,
        },
      });
      createdDrivers.push(driver);
      console.log('✅ Created/Updated driver:', driver.vehicleNumber, `(${driverData.vehicleModel})`);
    }
  }

  // Create driver documents for all drivers
  for (const driver of createdDrivers) {
    const documents = [
      {
        driverId: driver.id,
        documentType: 'LICENSE' as const,
        documentUrl: `https://example.com/license_${driver.vehicleNumber}.pdf`,
        isVerified: true,
        verifiedAt: new Date(),
      },
      {
        driverId: driver.id,
        documentType: 'RC' as const,
        documentUrl: `https://example.com/rc_${driver.vehicleNumber}.pdf`,
        isVerified: true,
        verifiedAt: new Date(),
      },
      {
        driverId: driver.id,
        documentType: 'INSURANCE' as const,
        documentUrl: `https://example.com/insurance_${driver.vehicleNumber}.pdf`,
        isVerified: true,
        verifiedAt: new Date(),
      },
    ];

    for (const doc of documents) {
      await prisma.driverDocument.create({
        data: doc,
      });
    }
  }

  console.log('✅ Created driver documents for all drivers');

  // Create sample rides
  const sampleRides = [
    {
      passengerPhone: '+919876543210',
      driverPhone: '+919876543214',
      pickupLatitude: 28.6139,
      pickupLongitude: 77.2090,
      dropLatitude: 28.5355,
      dropLongitude: 77.3910,
      pickupAddress: 'Connaught Place, New Delhi',
      dropAddress: 'India Gate, New Delhi',
      distance: 12.5,
      duration: 25,
      baseFare: 25,
      distanceFare: 150,
      timeFare: 50,
      totalFare: 225,
      status: 'RIDE_COMPLETED' as const,
      paymentMethod: 'CASH' as const,
      paymentStatus: 'PAID' as const,
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      completedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
    },
    {
      passengerPhone: '+919876543211',
      driverPhone: '+919876543215',
      pickupLatitude: 28.5562,
      pickupLongitude: 77.1000,
      dropLatitude: 28.6139,
      dropLongitude: 77.2090,
      pickupAddress: 'Delhi Airport, New Delhi',
      dropAddress: 'Connaught Place, New Delhi',
      distance: 18.2,
      duration: 35,
      baseFare: 25,
      distanceFare: 218,
      timeFare: 70,
      totalFare: 313,
      status: 'RIDE_COMPLETED' as const,
      paymentMethod: 'UPI' as const,
      paymentStatus: 'PAID' as const,
      startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      completedAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000), // 3.5 hours ago
    },
    {
      passengerPhone: '+919876543212',
      driverPhone: '+919876543214',
      pickupLatitude: 28.5355,
      pickupLongitude: 77.3910,
      dropLatitude: 28.5562,
      dropLongitude: 77.1000,
      pickupAddress: 'India Gate, New Delhi',
      dropAddress: 'Delhi Airport, New Delhi',
      distance: 22.8,
      duration: 45,
      baseFare: 25,
      distanceFare: 274,
      timeFare: 90,
      totalFare: 389,
      status: 'RIDE_COMPLETED' as const,
      paymentMethod: 'CARD' as const,
      paymentStatus: 'PAID' as const,
      startedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    },
  ];

  for (const rideData of sampleRides) {
    const passenger = await prisma.user.findFirst({ where: { phone: rideData.passengerPhone } });
    const driverUser = await prisma.user.findFirst({ where: { phone: rideData.driverPhone } });
    const driverProfile = await prisma.driver.findFirst({ where: { userId: driverUser?.id } });

    if (passenger && driverProfile) {
      const ride = await prisma.ride.create({
        data: {
          passengerId: passenger.id,
          driverId: driverProfile.id,
          pickupLatitude: rideData.pickupLatitude,
          pickupLongitude: rideData.pickupLongitude,
          dropLatitude: rideData.dropLatitude,
          dropLongitude: rideData.dropLongitude,
          pickupAddress: rideData.pickupAddress,
          dropAddress: rideData.dropAddress,
          distance: rideData.distance,
          duration: rideData.duration,
          baseFare: rideData.baseFare,
          distanceFare: rideData.distanceFare,
          timeFare: rideData.timeFare,
          totalFare: rideData.totalFare,
          status: rideData.status,
          paymentMethod: rideData.paymentMethod,
          paymentStatus: rideData.paymentStatus,
          startedAt: rideData.startedAt,
          completedAt: rideData.completedAt,
        },
      });

      // Create driver earnings for completed rides
      if (rideData.status === 'RIDE_COMPLETED') {
        const commission = rideData.totalFare * 0.2; // 20% commission
        const netAmount = rideData.totalFare - commission;

        await prisma.driverEarning.create({
          data: {
            driverId: driverProfile.id,
            rideId: ride.id,
            amount: rideData.totalFare,
            commission: commission,
            netAmount: netAmount,
            date: rideData.completedAt!,
          },
        });
      }

      console.log('✅ Created ride:', ride.id, `₹${rideData.totalFare}`);
    }
  }

  console.log('✅ Created sample rides and earnings');

  // Create sample notifications
  const notifications = [
    {
      userId: (await prisma.user.findFirst({ where: { phone: '+919876543210' } }))!.id,
      title: 'Welcome to Raahi!',
      message: 'Thank you for joining Raahi. Your journey starts here!',
      type: 'SYSTEM' as const,
      isRead: false,
    },
    {
      userId: (await prisma.user.findFirst({ where: { phone: '+919876543211' } }))!.id,
      title: 'Ride Completed',
      message: 'Your ride from Connaught Place to India Gate has been completed.',
      type: 'RIDE_UPDATE' as const,
      isRead: true,
    },
  ];

  for (const notification of notifications) {
    await prisma.notification.create({
      data: notification,
    });
  }

  console.log('✅ Created sample notifications');

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
