import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { getComplaint, updateComplaint, deleteComplaint } from '../../../../modules/complaints/services/complaint.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const complaint = await getComplaint(id);

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    return NextResponse.json(complaint);
  } catch (error) {
    console.error('Get complaint error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch complaint' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const updateData = await request.json();

    const updatedComplaint = await updateComplaint(id, updateData);

    return NextResponse.json(updatedComplaint);
  } catch (error: any) {
    console.error('Update complaint error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update complaint' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await deleteComplaint(id);

    return NextResponse.json({ message: 'Complaint deleted successfully' });
  } catch (error: any) {
    console.error('Delete complaint error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete complaint' },
      { status: 500 }
    );
  }
}