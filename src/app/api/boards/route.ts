import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const boards = await db.board.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ boards });
  } catch (error) {
    console.error('Fetch boards error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { boardName, latitude, longitude, address, radius } = await request.json();
    if (!boardName || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Name, latitude, and longitude required' }, { status: 400 });
    }

    const board = await db.board.create({
      data: { boardName, latitude, longitude, address: address || null, radius: radius || 500, status: 'ACTIVE' },
    });
    return NextResponse.json({ board }, { status: 201 });
  } catch (error) {
    console.error('Create board error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, status, displayMessage, eta, direction, lastHeartbeat } = await request.json();
    if (!id) return NextResponse.json({ error: 'Id required' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (displayMessage !== undefined) data.displayMessage = displayMessage;
    if (eta !== undefined) data.eta = eta;
    if (direction !== undefined) data.direction = direction;
    if (lastHeartbeat) data.lastHeartbeat = new Date(lastHeartbeat);

    const board = await db.board.update({ where: { id }, data });
    return NextResponse.json({ board });
  } catch (error) {
    console.error('Update board error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Id required' }, { status: 400 });
    await db.board.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete board error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
