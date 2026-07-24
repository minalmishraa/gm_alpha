import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const drivers = await db.driver.findMany({
      include: { user: true, emergencies: { where: { status: 'ACTIVE' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });

    const safeDrivers = drivers.map((d) => ({
      ...d,
      user: d.user ? { ...d.user, password: undefined } : undefined,
    }));

    return NextResponse.json({ drivers: safeDrivers });
  } catch (error) {
    console.error('Fetch drivers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, verified, online, currentLatitude, currentLongitude, activeEmergency, vehicleNumber, vehicleType, licenseNumber } = await request.json();
    if (!id) return NextResponse.json({ error: 'Id required' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (verified !== undefined) data.verified = verified;
    if (online !== undefined) data.online = online;
    if (currentLatitude !== undefined) data.currentLatitude = currentLatitude;
    if (currentLongitude !== undefined) data.currentLongitude = currentLongitude;
    if (activeEmergency !== undefined) data.activeEmergency = activeEmergency;
    if (vehicleNumber !== undefined) data.vehicleNumber = vehicleNumber;
    if (vehicleType !== undefined) data.vehicleType = vehicleType;
    if (licenseNumber !== undefined) data.licenseNumber = licenseNumber;

    const driver = await db.driver.update({ where: { id }, data });

    if (verified === true) {
      await db.user.update({
        where: { id: driver.userId },
        data: { status: 'ACTIVE' },
      });
    }

    return NextResponse.json({ driver });
  } catch (error) {
    console.error('Update driver error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
