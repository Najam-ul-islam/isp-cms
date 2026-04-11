import { NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'

// GET /api/areas - Return all areas for the logged-in user's company
export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const areas = await prisma.area.findMany({
      where: {
        companyId: admin.companyId
      },
      include: {
        _count: {
          select: {
            clients: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(areas)
  } catch (error) {
    console.error('Get areas error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/areas - Create a new area
export async function POST(request: Request) {
  try {
    const admin = await getAdminFromToken(request)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description } = await request.json()

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Area name is required' },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()

    // Check for duplicate area name (case-insensitive) within the same company
    const existingArea = await prisma.area.findFirst({
      where: {
        companyId: admin.companyId,
        name: {
          equals: trimmedName,
          mode: 'insensitive'
        }
      }
    })

    if (existingArea) {
      return NextResponse.json(
        { error: `Area "${trimmedName}" already exists` },
        { status: 409 }
      )
    }

    // Create the new area
    const area = await prisma.area.create({
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        companyId: admin.companyId
      },
      include: {
        _count: {
          select: {
            clients: true
          }
        }
      }
    })

    return NextResponse.json(area, { status: 201 })
  } catch (error) {
    console.error('Create area error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
