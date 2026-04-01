import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';

export async function GET(request: Request) {
  try {
    // Extract the user from the token using our existing JWT utility
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return success response with basic user info
    return NextResponse.json({
      authenticated: true,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}