import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { createComplaint, getAllComplaints, getComplaintsByClient, getComplaintsByStatus } from '../../../modules/complaints/services/complaint.service';

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');

    let complaints;

    if (clientId) {
      complaints = await getComplaintsByClient(clientId);
    } else if (status) {
      // Convert status string to proper enum value
      const statusEnum = status.toUpperCase();
      if (['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(statusEnum)) {
        complaints = await getComplaintsByStatus(statusEnum as any);
      } else {
        return NextResponse.json(
          { error: 'Invalid status. Valid values: open, in_progress, resolved' },
          { status: 400 }
        );
      }
    } else {
      complaints = await getAllComplaints();
    }

    return NextResponse.json(complaints);
  } catch (error) {
    console.error('Get complaints error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch complaints' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId, title, description, priority } = await request.json();

    if (!clientId || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, title, description' },
        { status: 400 }
      );
    }

    const complaint = await createComplaint({
      clientId,
      title,
      description,
      priority
    });

    return NextResponse.json(complaint, { status: 201 });
  } catch (error: any) {
    console.error('Create complaint error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create complaint' },
      { status: 500 }
    );
  }
}