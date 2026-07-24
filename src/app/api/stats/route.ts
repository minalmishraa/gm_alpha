import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayEmergencies,
      activeEmergencies,
      onlineVehicles,
      totalDrivers,
      totalUsers,
      connectedBoards,
      totalBoards,
      pendingVerifications,
      completedToday,
    ] = await Promise.all([
      db.emergency.count({ where: { startedAt: { gte: today } } }),
      db.emergency.count({ where: { status: 'ACTIVE' } }),
      db.driver.count({ where: { online: true } }),
      db.driver.count(),
      db.user.count({ where: { role: 'PUBLIC' } }),
      db.board.count({ where: { status: 'ACTIVE' } }),
      db.board.count(),
      db.user.count({ where: { role: 'DRIVER', status: 'PENDING' } }),
      db.emergency.count({ where: { status: 'COMPLETED', startedAt: { gte: today } } }),
    ]);

    // Weekly data for charts
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [started, completed] = await Promise.all([
        db.emergency.count({
          where: { startedAt: { gte: date, lt: nextDate } },
        }),
        db.emergency.count({
          where: { status: 'COMPLETED', startedAt: { gte: date, lt: nextDate } },
        }),
      ]);

      weeklyData.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        started,
        completed,
      });
    }

    // Vehicle type distribution
    const vehicleTypeStats = await db.driver.groupBy({
      by: ['vehicleType'],
      _count: { id: true },
    });

    const vehicleDistribution = vehicleTypeStats.map((v) => ({
      type: v.vehicleType,
      count: v._count.id,
    }));

    return NextResponse.json({
      stats: {
        todayEmergencies,
        activeEmergencies,
        onlineVehicles,
        totalDrivers,
        totalUsers,
        connectedBoards,
        offlineBoards: totalBoards - connectedBoards,
        pendingVerifications,
        completedToday,
      },
      weeklyData,
      vehicleDistribution,
    });
  } catch (error) {
    console.error('Fetch stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
