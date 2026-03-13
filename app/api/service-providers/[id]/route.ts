import { NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/jwt'
import prisma from '@/lib/prisma'

// GET single service provider
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }  // ✅ params is now a Promise
) {
  try {
    const admin = await getAdminFromToken(request as any)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params  // ✅ Await params before accessing id
    const serviceProviderId = id

    const serviceProvider = await prisma.serviceProvider.findUnique({
      where: { id: serviceProviderId },
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
      }
    })

    if (!serviceProvider) {
      return NextResponse.json({ error: 'Service provider not found' }, { status: 404 })
    }

    return NextResponse.json(serviceProvider)
  } catch (error) {
    console.error('Get service provider error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// UPDATE service provider
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }  // ✅ params is now a Promise
) {
  try {
    const admin = await getAdminFromToken(request as any)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params  // ✅ Await params before accessing id
    const serviceProviderId = id

    const { name, contactInfo, address, email, phone, isActive } = await request.json()

    // Check if name is already taken by another service provider
    if (name) {
      const existingProvider = await prisma.serviceProvider.findFirst({
        where: {
          name,
          id: { not: serviceProviderId }  // Exclude current provider
        }
      })
      if (existingProvider) {
        return NextResponse.json(
          { error: 'A service provider with this name already exists' },
          { status: 400 }
        )
      }
    }

    const updatedServiceProvider = await prisma.serviceProvider.update({
      where: { id: serviceProviderId },
      data: {
        name: name || undefined,
        contactInfo: contactInfo || null,
        address: address || null,
        email: email || null,
        phone: phone || null,
        isActive: isActive !== undefined ? isActive : undefined
      }
    })

    return NextResponse.json(updatedServiceProvider)
  } catch (error) {
    console.error('Update service provider error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE service provider
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }  // ✅ params is now a Promise
) {
  try {
    const admin = await getAdminFromToken(request as any)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params  // ✅ Await params
    const serviceProviderId = id

    // Check if there are packages associated with this service provider
    const packagesWithProvider = await prisma.package.count({
      where: { serviceProviderId }
    })

    if (packagesWithProvider > 0) {
      return NextResponse.json(
        { error: 'Cannot delete service provider with associated packages' },
        { status: 400 }
      )
    }

    await prisma.serviceProvider.delete({
      where: { id: serviceProviderId }
    })

    return NextResponse.json({ message: 'Service provider deleted successfully' })
  } catch (error) {
    console.error('Delete service provider error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}