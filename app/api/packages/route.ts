import { NextResponse } from 'next/server'
  import { getAdminFromToken } from '@/lib/jwt'
  import {prisma} from '@/lib/prisma'

  export async function GET(request: Request) {
    try {
      const admin = await getAdminFromToken(request);

      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check if user has permission to read packages
      if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const packages = await prisma.package.findMany({
        where: {
          companyId: admin.companyId  // Only return packages from admin's company
        },
        include: {
          serviceProvider: true,  // Include service provider information
          _count: {
            select: {
              clients: true  // Include count of associated clients
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return NextResponse.json(packages)
    } catch (error) {
      console.error('Get packages error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  export async function POST(request: Request) {
    try {
      const admin = await getAdminFromToken(request);

      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check if user has permission to create packages
      if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const { name, speed, price, purchasePrice, durationDays, serviceProviderId, companyId: requestCompanyId } = await request.json()

      // Validate required fields (excluding companyId which should come from admin)
      if (!name || !speed || !price || !durationDays) {
        return NextResponse.json(
          { error: 'Missing required fields: name, speed, price, durationDays' },
          { status: 400 }
        )
      }

      // Use the admin's company ID instead of the one from request
      const companyId = admin.companyId;

      // Check if package with same name already exists for this company
      const existingPackage = await prisma.package.findFirst({
        where: {
          companyId,
          name,
        },
      });

      if (existingPackage) {
        return NextResponse.json(
          { error: `A package with the name "${name}" already exists` },
          { status: 409 }
        )
      }

      const pkg = await prisma.package.create({
        data: {
          name,
          speed,
          price,
          purchasePrice: purchasePrice || 0, // Default to 0 if not provided
          durationDays,
          serviceProviderId: serviceProviderId || null, // Connect to service provider if provided
          companyId,
          createdBy: admin.id  // Use the authenticated admin's ID as the creator
        }
      })

      return NextResponse.json(pkg, { status: 201 })
    } catch (error: any) {
      // Handle unique constraint violation
      if (error?.code === 'P2002' && error?.meta?.target?.includes('name')) {
        return NextResponse.json(
          { error: 'A package with this name already exists. Package names must be unique across all companies.' },
          { status: 409 }
        )
      }
      console.error('Create package error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }