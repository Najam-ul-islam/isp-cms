import { NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/jwt'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request as any)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceProviders = await prisma.serviceProvider.findMany({
      where: {
        isActive: true
      },
      include: {
        _count: {
          select: {
            packages: {
              where: {
                isActive: true
              }
            }
          }
        },
        packages: {
          where: {
            isActive: true
          },
          orderBy: {
            name: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(serviceProviders)
  } catch (error) {
    console.error('Get service providers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromToken(request as any)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, contactInfo, address, email, phone } = await request.json()

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const serviceProvider = await prisma.serviceProvider.create({
      data: {
        name,
        contactInfo: contactInfo || null,
        address: address || null,
        email: email || null,
        phone: phone || null
      }
    })

    return NextResponse.json(serviceProvider, { status: 201 })
  } catch (error) {
    console.error('Create service provider error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}