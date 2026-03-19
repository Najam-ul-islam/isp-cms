import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Create a response that clears the token cookie
    const response = NextResponse.json({
      message: 'Logged out successfully'
    });

    // Clear the token cookie
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0, // Expires immediately
      path: '/',
      sameSite: 'strict',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}