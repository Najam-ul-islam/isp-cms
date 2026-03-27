import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import {
  getEmployeeById,
  trackEmployeeActivity,
  getEmployeeActivities
} from '../../../../modules/employees/services';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view employee
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const employeeId = id;

    const employee = await getEmployeeById(admin, employeeId);

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to track employee activity
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const employeeId = id;

    const body = await request.json();
    const { action, metadata } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Validate action length
    if (typeof action !== 'string' || action.trim().length === 0) {
      return NextResponse.json(
        { error: 'Action must be a non-empty string' },
        { status: 400 }
      );
    }

    const activity = await trackEmployeeActivity(admin, employeeId, action, metadata);
    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error('Track employee activity error:', error);

    if (error instanceof Error && (error.message?.includes('not found') || error.message?.includes('does not belong'))) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
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

    // Check if user has permission to update employee
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const employeeId = id;

    const body = await request.json();
    const { action, ...updateData } = body;

    if (action === 'activities') {
      const activities = await getEmployeeActivities(admin, employeeId);
      return NextResponse.json(activities);
    }

    // Default to update employee - validate email if provided
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Validate role if provided
    if (updateData.role && !['EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'].includes(updateData.role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be EMPLOYEE, ADMIN, or SUPER_ADMIN' },
        { status: 400 }
      );
    }

    // Validate employee exists
    const employee = await getEmployeeById(admin, employeeId);

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const { updateEmployee } = await import('../../../../modules/employees/services');
    const updatedEmployee = await updateEmployee(admin, employeeId, updateData);

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    console.error('Update employee error:', error);

    if (error instanceof Error && (error.message?.includes('not found') || error.message?.includes('does not belong'))) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}