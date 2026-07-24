import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const emergencies = await db.emergency.findMany({
      include: { driver: { include: { user: true } } },
      orderBy: { startedAt: 'desc' },
    });

    const safeEmergencies = emergencies.map((e) => ({
      ...e,
      driver: e.driver
        ? { ...e.driver, user: e.driver.user ? { ...e.driver.user, password: undefined } : undefined }
        : undefined,
    }));

    return NextResponse.json({ emergencies: safeEmergencies });
  } catch (error) {
    console.error('Fetch emergencies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { driverId, vehicleType, destinationName, destinationLatitude, destinationLongitude } = await request.json();
    if (!driverId || !vehicleType || !destinationName || destinationLatitude === undefined || destinationLongitude === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const driver = await db.driver.findUnique({ where: { id: driverId } });
    if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

    const emergency = await db.emergency.create({
      data: {
        driverId,
        vehicleType,
        destinationName,
        destinationLatitude,
        destinationLongitude,
        currentLatitude: driver.currentLatitude,
        currentLongitude: driver.currentLongitude,
        speed: 40,
        distanceRemaining: 5.0,
        eta: 420,
        status: 'ACTIVE',
      },
      include: { driver: { include: { user: true } } },
    });

    await db.driver.update({
      where: { id: driverId },
      data: { activeEmergency: true },
    });

    return NextResponse.json({ emergency }, { status: 201 });
  } catch (error) {
    console.error('Create emergency error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, status, currentLatitude, currentLongitude, speed, distanceRemaining, eta } = await request.json();
    if (!id) return NextResponse.json({ error: 'Id required' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (currentLatitude !== undefined) data.currentLatitude = currentLatitude;
    if (currentLongitude !== undefined) data.currentLongitude = currentLongitude;
    if (speed !== undefined) data.speed = speed;
    if (distanceRemaining !== undefined) data.distanceRemaining = distanceRemaining;
    if (eta !== undefined) data.eta = eta;

    if (status === 'COMPLETED' || status === 'CANCELLED') {
      data.endedAt = new Date();
      const emergency = await db.emergency.findUnique({ where: { id } });
      if (emergency) {
        await db.driver.update({ where: { id: emergency.driverId }, data: { activeEmergency: false } });
      }
    }

    const emergency = await db.emergency.update({ where: { id }, data });
    return NextResponse.json({ emergency });
  } catch (error) {
    console.error('Update emergency error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Id required' }, { status: 400 });
    await db.emergency.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete emergency error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
