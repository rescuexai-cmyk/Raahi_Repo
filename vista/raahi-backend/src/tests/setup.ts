import { prisma } from '@/database/connection';

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

afterAll(async () => {
  // Clean up and disconnect
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean up test data before each test
  await prisma.rideTracking.deleteMany();
  await prisma.rideMessage.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.driverEarning.deleteMany();
  await prisma.driverDocument.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();
});
