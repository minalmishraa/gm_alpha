import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function seed() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await db.notification.deleteMany();
  await db.emergency.deleteMany();
  await db.driver.deleteMany();
  await db.board.deleteMany();
  await db.hospital.deleteMany();
  await db.analyticsEvent.deleteMany();
  await db.user.deleteMany();

  // Create Admin user
  const adminPassword = await hashPassword('admin123');
  const admin = await db.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@lifeline.com',
      phone: '+977-9800000001',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // Create Drivers with accounts
  const driverPassword = await hashPassword('driver123');
  const driverUsers = [];
  const driverData = [
    { name: 'Raj Sharma', email: 'raj@lifeline.com', phone: '+977-9800000002', vehicle: 'KA 101 JA 1234', type: 'AMBULANCE', license: 'DL-2024-001', verified: true, online: true, lat: 27.7172, lng: 85.324 },
    { name: 'Sita Devi', email: 'sita@lifeline.com', phone: '+977-9800000003', vehicle: 'KA 201 JA 5678', type: 'AMBULANCE', license: 'DL-2024-002', verified: true, online: true, lat: 27.7050, lng: 85.3150 },
    { name: 'Hari Thapa', email: 'hari@lifeline.com', phone: '+977-9800000004', vehicle: 'KA 301 FB 9012', type: 'FIRE_BRIGADE', license: 'DL-2024-003', verified: true, online: false, lat: 27.7100, lng: 85.3280 },
    { name: 'Gita Magar', email: 'gita@lifeline.com', phone: '+977-9800000005', vehicle: 'KA 401 PL 3456', type: 'POLICE', license: 'DL-2024-004', verified: true, online: true, lat: 27.7200, lng: 85.3350 },
    { name: 'Bikash Rai', email: 'bikash@lifeline.com', phone: '+977-9800000006', vehicle: 'KA 501 DR 7890', type: 'AMBULANCE', license: 'DL-2024-005', verified: false, online: false, lat: null, lng: null },
    { name: 'Anita Gurung', email: 'anita@lifeline.com', phone: '+977-9800000007', vehicle: 'KA 601 FB 2345', type: 'FIRE_BRIGADE', license: 'DL-2024-006', verified: false, online: false, lat: null, lng: null },
  ];

  for (const d of driverData) {
    const user = await db.user.create({
      data: {
        name: d.name,
        email: d.email,
        phone: d.phone,
        password: driverPassword,
        role: 'DRIVER',
        status: d.verified ? 'ACTIVE' : 'PENDING',
      },
    });
    const driver = await db.driver.create({
      data: {
        userId: user.id,
        vehicleNumber: d.vehicle,
        vehicleType: d.type,
        licenseNumber: d.license,
        verified: d.verified,
        currentLatitude: d.lat,
        currentLongitude: d.lng,
        online: d.online,
        activeEmergency: false,
      },
    });
    driverUsers.push({ ...user, driver });
  }

  // Create Public Users
  const publicPassword = await hashPassword('user123');
  const publicUsers = [];
  const publicData = [
    { name: 'Ram Bahadur', email: 'ram@lifeline.com', phone: '+977-9800000010' },
    { name: 'Sita Kumari', email: 'kumari@lifeline.com', phone: '+977-9800000011' },
    { name: 'Krishna Adhikari', email: 'krishna@lifeline.com', phone: '+977-9800000012' },
    { name: 'Maya Lama', email: 'maya@lifeline.com', phone: '+977-9800000013' },
    { name: 'Deepak Shrestha', email: 'deepak@lifeline.com', phone: '+977-9800000014' },
  ];

  for (const p of publicData) {
    const user = await db.user.create({
      data: {
        name: p.name,
        email: p.email,
        phone: p.phone,
        password: publicPassword,
        role: 'PUBLIC',
        status: 'ACTIVE',
      },
    });
    publicUsers.push(user);
  }

  // Create Display Boards
  const boards = await Promise.all([
    db.board.create({
      data: {
        boardName: 'Thamel Crossing Board',
        latitude: 27.7147,
        longitude: 85.3108,
        address: 'Thamel, Kathmandu',
        status: 'ACTIVE',
        radius: 500,
        lastHeartbeat: new Date(),
      },
    }),
    db.board.create({
      data: {
        boardName: 'Durbar Square Board',
        latitude: 27.7069,
        longitude: 85.3105,
        address: 'Durbar Square, Kathmandu',
        status: 'ACTIVE',
        radius: 400,
        lastHeartbeat: new Date(),
      },
    }),
    db.board.create({
      data: {
        boardName: 'Boudhanath Board',
        latitude: 27.7222,
        longitude: 85.3614,
        address: 'Boudhanath, Kathmandu',
        status: 'ACTIVE',
        radius: 600,
        lastHeartbeat: new Date(),
      },
    }),
    db.board.create({
      data: {
        boardName: 'Pashupatinath Board',
        latitude: 27.7105,
        longitude: 85.3465,
        address: 'Pashupatinath, Kathmandu',
        status: 'ACTIVE',
        radius: 500,
        lastHeartbeat: new Date(Date.now() - 120000),
        displayMessage: '🚑 Ambulance Approaching',
        eta: 120,
        direction: 'East',
      },
    }),
    db.board.create({
      data: {
        boardName: 'Nagarkot Junction Board',
        latitude: 27.7833,
        longitude: 85.5167,
        address: 'Nagarkot, Bhaktapur',
        status: 'INACTIVE',
        radius: 500,
        lastHeartbeat: new Date(Date.now() - 86400000),
      },
    }),
    db.board.create({
      data: {
        boardName: 'Patan Hospital Board',
        latitude: 27.6802,
        longitude: 85.3179,
        address: 'Patan, Lalitpur',
        status: 'MAINTENANCE',
        radius: 400,
        lastHeartbeat: new Date(Date.now() - 3600000),
      },
    }),
  ]);

  // Create Hospitals
  const hospitals = await Promise.all([
    db.hospital.create({
      data: { name: 'Tribhuvan University Teaching Hospital', latitude: 27.7172, longitude: 85.3180, beds: 450, contact: '+977-1-4261539', address: 'Maharajgunj, Kathmandu' },
    }),
    db.hospital.create({
      data: { name: 'Patan Hospital', latitude: 27.6802, longitude: 85.3179, beds: 320, contact: '+977-1-5522266', address: 'Lagankhel, Lalitpur' },
    }),
    db.hospital.create({
      data: { name: 'Bir Hospital', latitude: 27.7103, longitude: 85.3126, beds: 500, contact: '+977-1-4221269', address: 'Kathmandu' },
    }),
    db.hospital.create({
      data: { name: 'Kathmandu Medical College', latitude: 27.7175, longitude: 85.3345, beds: 280, contact: '+977-1-4370608', address: 'Sinamangal, Kathmandu' },
    }),
    db.hospital.create({
      data: { name: 'Norvic International Hospital', latitude: 27.7168, longitude: 85.3288, beds: 200, contact: '+977-1-4429999', address: 'Thapathali, Kathmandu' },
    }),
    db.hospital.create({
      data: { name: 'Grande International Hospital', latitude: 27.7277, longitude: 85.3310, beds: 350, contact: '+977-1-5155555', address: 'Dhapakhel, Lalitpur' },
    }),
  ]);

  // Create sample emergencies (history)
  const now = new Date();
  const emergencies = await Promise.all([
    db.emergency.create({
      data: {
        driverId: driverUsers[0].driver.id,
        vehicleType: 'AMBULANCE',
        destinationName: 'Bir Hospital',
        destinationLatitude: 27.7103,
        destinationLongitude: 85.3126,
        currentLatitude: 27.7120,
        currentLongitude: 85.3200,
        speed: 45,
        distanceRemaining: 2.3,
        eta: 300,
        startedAt: new Date(now.getTime() - 15 * 60000),
        status: 'ACTIVE',
      },
    }),
    db.emergency.create({
      data: {
        driverId: driverUsers[1].driver.id,
        vehicleType: 'AMBULANCE',
        destinationName: 'Patan Hospital',
        destinationLatitude: 27.6802,
        destinationLongitude: 85.3179,
        currentLatitude: 27.6950,
        currentLongitude: 85.3160,
        speed: 35,
        distanceRemaining: 1.8,
        eta: 240,
        startedAt: new Date(now.getTime() - 20 * 60000),
        status: 'ACTIVE',
      },
    }),
    db.emergency.create({
      data: {
        driverId: driverUsers[3].driver.id,
        vehicleType: 'POLICE',
        destinationName: 'Durbar Square',
        destinationLatitude: 27.7069,
        destinationLongitude: 85.3105,
        startedAt: new Date(now.getTime() - 3 * 3600000),
        endedAt: new Date(now.getTime() - 2 * 3600000),
        status: 'COMPLETED',
      },
    }),
    db.emergency.create({
      data: {
        driverId: driverUsers[2].driver.id,
        vehicleType: 'FIRE_BRIGADE',
        destinationName: 'Thamel',
        destinationLatitude: 27.7147,
        destinationLongitude: 85.3108,
        startedAt: new Date(now.getTime() - 6 * 3600000),
        endedAt: new Date(now.getTime() - 5 * 3600000),
        status: 'COMPLETED',
      },
    }),
    db.emergency.create({
      data: {
        driverId: driverUsers[0].driver.id,
        vehicleType: 'AMBULANCE',
        destinationName: 'Kathmandu Medical College',
        destinationLatitude: 27.7175,
        destinationLongitude: 85.3345,
        startedAt: new Date(now.getTime() - 24 * 3600000),
        endedAt: new Date(now.getTime() - 23 * 3600000),
        status: 'COMPLETED',
      },
    }),
  ]);

  // Create notifications
  await Promise.all([
    db.notification.create({
      data: { receiverId: publicUsers[0].id, title: '🚑 Ambulance Nearby', body: 'An ambulance is approaching from Putalisadak area. Please give way.', type: 'ALERT', read: false },
    }),
    db.notification.create({
      data: { receiverId: publicUsers[0].id, title: '🚔 Police Emergency', body: 'Police vehicle responding to emergency near Durbar Square. Stay alert.', type: 'WARNING', read: false },
    }),
    db.notification.create({
      data: { receiverId: publicUsers[1].id, title: '🚑 Ambulance Approaching', body: 'An ambulance is heading towards Patan Hospital from Jawalakhel direction.', type: 'ALERT', read: true },
    }),
    db.notification.create({
      data: { receiverId: publicUsers[2].id, title: 'ℹ️ Emergency Tip', body: 'Always keep emergency lanes clear. Your cooperation saves lives.', type: 'INFO', read: true },
    }),
    db.notification.create({
      data: { receiverId: publicUsers[3].id, title: '🚒 Fire Brigade Active', body: 'Fire brigade responding to incident near Thamel. Avoid the area if possible.', type: 'WARNING', read: false },
    }),
    db.notification.create({
      data: { receiverId: admin.id, title: 'New Driver Registration', body: 'Bikash Rai has registered as an ambulance driver and needs verification.', type: 'INFO', read: false },
    }),
    db.notification.create({
      data: { receiverId: admin.id, title: 'Board Offline Alert', body: 'Nagarkot Junction Board has been offline for over 24 hours.', type: 'WARNING', read: false },
    }),
  ]);

  // Update drivers with active emergency status
  await db.driver.update({
    where: { id: driverUsers[0].driver.id },
    data: { activeEmergency: true },
  });
  await db.driver.update({
    where: { id: driverUsers[1].driver.id },
    data: { activeEmergency: true },
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('  Admin:  admin@lifeline.com / admin123');
  console.log('  Driver: raj@lifeline.com / driver123');
  console.log('  Driver (unverified): bikash@lifeline.com / driver123');
  console.log('  Public: ram@lifeline.com / user123');
  console.log('\n📊 Created:');
  console.log(`  ${1} Admin`);
  console.log(`  ${driverUsers.length} Drivers (${driverUsers.filter(d => d.driver.verified).length} verified, ${driverUsers.filter(d => !d.driver.verified).length} pending)`);
  console.log(`  ${publicUsers.length} Public Users`);
  console.log(`  ${boards.length} Display Boards`);
  console.log(`  ${hospitals.length} Hospitals`);
  console.log(`  ${emergencies.length} Emergencies (${emergencies.filter(e => e.status === 'ACTIVE').length} active)`);
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));
