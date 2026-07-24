import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const notifications = await db.notification.findMany({
      where: { receiverId: userId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Id required' }, { status: 400 });

    await db.notification.update({ where: { id }, data: { read: true } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
