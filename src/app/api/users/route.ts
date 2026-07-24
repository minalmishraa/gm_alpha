import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { driver: true },
    });
    const safeUsers = users.map(({ password: _, ...u }) => u);
    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Id and status required' }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id },
      data: { status },
      include: { driver: true },
    });

    if (user.role === 'DRIVER' && user.driver && status === 'ACTIVE') {
      await db.driver.update({
        where: { id: user.driver.id },
        data: { verified: true },
      });
    }

    const { password: _, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Id required' }, { status: 400 });

    await db.notification.deleteMany({ where: { receiverId: id } });
    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
