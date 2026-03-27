import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import {
  createEmployee,
  getEmployees,
  getEmployeeStats,
  updateEmployee,
  deleteEmployee,
  assignRole
} from '../../../modules/employees/services';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view employees
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const role = searchParams.get('role') || undefined;
    const search = searchParams.get('search') || undefined;
    const action = searchParams.get('action'); // Check for special actions

    // Handle special actions
    if (action === 'stats') {
      const stats = await getEmployeeStats(admin);
      return NextResponse.json(stats);
    }

    const filters = {
      role,
      search
    };

    const employees = await getEmployees(admin, filters);

    return NextResponse.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create employees
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();

    const { name, email, phone, role, salary } = body;

    // Validate required fields
    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, role' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be EMPLOYEE, ADMIN, or SUPER_ADMIN' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate salary if provided
    if (salary !== undefined && typeof salary !== 'number') {
      return NextResponse.json(
        { error: 'Salary must be a number' },
        { status: 400 }
      );
    }

    const employee = await createEmployee(admin, {
      name,
      email,
      phone,
      role,
      salary
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Create employee error:', error);

    if (error instanceof Error && error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to update employees
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, action, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    if (action === 'assign-role') {
      if (!updateData.role) {
        return NextResponse.json(
          { error: 'Role is required for assign-role action' },
          { status: 400 }
        );
      }

      // Validate role
      if (!['EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'].includes(updateData.role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be EMPLOYEE, ADMIN, or SUPER_ADMIN' },
          { status: 400 }
        );
      }

      const employee = await assignRole(admin, id, updateData.role);
      return NextResponse.json(employee);
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

    const employee = await updateEmployee(admin, id, updateData);
    return NextResponse.json(employee);
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

export async function DELETE(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to delete employees
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const result = await deleteEmployee(admin, id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Delete employee error:', error);

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