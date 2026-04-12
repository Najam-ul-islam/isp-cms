import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { assignComplaintToEmployee } from '../../../../../modules/complaints/services';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to assign complaints
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { employeeId } = body;

    // Validate employeeId if provided (null is allowed for unassigning)
    if (employeeId !== null && typeof employeeId !== 'string') {
      return NextResponse.json(
        { error: 'employeeId must be a string or null' },
        { status: 400 }
      );
    }

    // Assign complaint to employee (with multi-tenant validation)
    const updatedComplaint = await assignComplaintToEmployee(
      id,
      employeeId,
      admin.companyId
    );

    return NextResponse.json(updatedComplaint);
  } catch (error) {
    console.error('Assign complaint error:', error);

    if (error instanceof Error) {
      if (error.message === 'Complaint not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes('does not belong')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      if (error.message === 'Employee not found') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to assign complaint' },
      { status: 500 }
    );
  }
}
