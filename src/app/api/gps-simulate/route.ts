import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GPS simulation endpoint - moves vehicles toward their destinations
// Called by the frontend polling loop to create realistic movement
export async function POST(request: Request) {
  try {
    const activeEmergencies = await db.emergency.findMany({
      where: { status: 'ACTIVE' },
    });

    if (activeEmergencies.length === 0) {
      return NextResponse.json({ updated: 0, emergencies: [] });
    }

    const results = [];

    for (const emergency of activeEmergencies) {
      const currentLat = emergency.currentLatitude ?? emergency.destinationLatitude;
      const currentLng = emergency.currentLongitude ?? emergency.destinationLongitude;
      const destLat = emergency.destinationLatitude;
      const destLng = emergency.destinationLongitude;

      // Calculate distance to destination
      const dLat = destLat - currentLat;
      const dLng = destLng - currentLng;
      const distKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111; // rough km conversion

      // If already very close, complete the emergency
      if (distKm < 0.05) {
        const completed = await db.emergency.update({
          where: { id: emergency.id },
          data: {
            status: 'COMPLETED',
            endedAt: new Date(),
            currentLatitude: destLat,
            currentLongitude: destLng,
            speed: 0,
            distanceRemaining: 0,
            eta: 0,
          },
        });
        await db.driver.update({
          where: { id: emergency.driverId },
          data: { activeEmergency: false, currentLatitude: destLat, currentLongitude: destLng },
        });
        results.push(completed);
        continue;
      }

      // Simulate movement: move ~2-5% of remaining distance per tick
      const speed = 30 + Math.random() * 25; // 30-55 km/h random
      const fraction = 0.03 + Math.random() * 0.02; // 3-5% per tick
      const newLat = currentLat + dLat * fraction;
      const newLng = currentLng + dLng * fraction;

      // Recalculate remaining distance and ETA
      const newDLat = destLat - newLat;
      const newDLng = destLng - newLng;
      const newDistKm = Math.sqrt(newDLat * newDLat + newDLng * newDLng) * 111;
      const etaSeconds = Math.max(0, Math.round((newDistKm / speed) * 3600));

      // Update the driver's current position
      await db.driver.update({
        where: { id: emergency.driverId },
        data: { currentLatitude: newLat, currentLongitude: newLng },
      });

      const updated = await db.emergency.update({
        where: { id: emergency.id },
        data: {
          currentLatitude: newLat,
          currentLongitude: newLng,
          speed: Math.round(speed),
          distanceRemaining: Math.round(newDistKm * 10) / 10,
          eta: etaSeconds,
        },
      });

      results.push(updated);
    }

    return NextResponse.json({ updated: results.length, emergencies: results });
  } catch (error) {
    console.error('GPS simulation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
