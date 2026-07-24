import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const hospitals = await db.hospital.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ hospitals });
  } catch (error) {
    console.error('Fetch hospitals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, latitude, longitude, beds, contact, address } = await request.json();
    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Name, latitude, and longitude required' }, { status: 400 });
    }

    const hospital = await db.hospital.create({
      data: { name, latitude, longitude, beds: beds || 0, contact: contact || null, address: address || null },
    });
    return NextResponse.json({ hospital }, { status: 201 });
  } catch (error) {
    console.error('Create hospital error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, beds, contact, address } = await request.json();
    if (!id) return NextResponse.json({ error: 'Id required' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (beds !== undefined) data.beds = beds;
    if (contact !== undefined) data.contact = contact;
    if (address !== undefined) data.address = address;

    const hospital = await db.hospital.update({ where: { id }, data });
    return NextResponse.json({ hospital });
  } catch (error) {
    console.error('Update hospital error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Id required' }, { status: 400 });
    await db.hospital.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete hospital error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
