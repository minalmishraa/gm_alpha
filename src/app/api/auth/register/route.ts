import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password, role } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Name, email, password, and role are required' }, { status: 400 });
    }

    if (!['DRIVER', 'PUBLIC'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: hashedPassword,
        role,
        status: role === 'DRIVER' ? 'PENDING' : 'ACTIVE',
        ...(role === 'DRIVER'
          ? {
              driver: {
                create: {
                  vehicleNumber: '',
                  vehicleType: 'AMBULANCE',
                  licenseNumber: '',
                  verified: false,
                },
              },
            }
          : {}),
      },
      include: { driver: true },
    });

    const { password: _, ...safeUser } = user;
    return NextResponse.json({ user: safeUser }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
