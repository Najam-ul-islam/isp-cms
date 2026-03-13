import { NextResponse } from 'next/server'
  import { authenticateAdmin, generateToken } from '@/lib/auth'
  import prisma from '@/lib/prisma'

  export async function POST(request: Request) {
    try {
      const { email, password } = await request.json()

      // Validate input
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email and password are required' },
          { status: 400 }
        )
      }

      // Authenticate admin
      const admin = await authenticateAdmin(email, password)

      if (!admin) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        )
      }

      // Generate token
      const token = generateToken(admin.id)

      return NextResponse.json({
        message: 'Signin successful',
        admin: { id: admin.id, name: admin.name, email: admin.email },
        token
      })
    } catch (error) {
      console.error('Signin error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
    }