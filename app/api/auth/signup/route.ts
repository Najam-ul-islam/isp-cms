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
      const adminCount = await prisma.admin.count()

      // Check if email already exists
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

      // Create a company first (for now, using a default company approach)
      // In a real scenario, we'd have a proper company creation flow
      // For now, we'll create a company with the admin's name as the company name
      const company = await prisma.company.create({
        data: {
          name: `${name}'s Company`,
        }
      });

      // If this is the first user signing up, make them a SUPER_ADMIN
      // Otherwise, default to EMPLOYEE role
      const role = adminCount === 0 ? Role.SUPER_ADMIN : Role.EMPLOYEE;

      // Create admin with appropriate role and assign to company
      const admin = await prisma.admin.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,  // First user gets SUPER_ADMIN, others get EMPLOYEE
          companyId: company.id
        }
      })

      // Generate token with role and company information
      const token = generateToken(admin.id, admin.role, admin.companyId)

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