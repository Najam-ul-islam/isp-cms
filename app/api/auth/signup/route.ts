import { NextResponse } from 'next/server'
  import { hashPassword, generateToken } from '@/lib/auth'
  import {prisma} from '@/lib/prisma'
  import { Role } from '@prisma/client'

  export async function POST(request: Request) {
    try {
      const { name, email, password } = await request.json()

      // Validate input
      if (!name || !email || !password) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      }

      // Check if admin already exists
      const existingAdmin = await prisma.admin.findUnique({
        where: { email }
      })

      if (existingAdmin) {
        return NextResponse.json(
          { error: 'Admin with this email already exists' },
          { status: 400 }
        )
      }

      // Hash password
      const hashedPassword = await hashPassword(password)

      // Create admin with default EMPLOYEE role
      const admin = await prisma.admin.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: Role.EMPLOYEE  // Default role for new users
        }
      })

      // Generate token with role information
      const token = generateToken(admin.id, admin.role)

      return NextResponse.json({
        message: 'Admin created successfully',
        admin: { id: admin.id, name: admin.name, email: admin.email },
        token
      })
    } catch (error) {
      console.error('Signup error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }