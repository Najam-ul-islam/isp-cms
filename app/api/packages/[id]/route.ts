import { NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/jwt'
import prisma from '@/lib/prisma'

// GET single package
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
    const packageId = id

    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        serviceProvider: true  // Include service provider information
      }
    })

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    return NextResponse.json(pkg)
  } catch (error) {
    console.error('Get package error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// UPDATE package
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
    const packageId = id
    
    const { name, speed, price, purchasePrice, durationDays, serviceProviderId } = await request.json()

    const updatedPackage = await prisma.package.update({
      where: { id: packageId },
      data: {
        name,
        speed,
        price,
        purchasePrice: purchasePrice || 0,
        durationDays,
        serviceProviderId: serviceProviderId || null
        // Don't update createdBy as it represents the original creator
      }
    })

    return NextResponse.json(updatedPackage)
  } catch (error) {
    console.error('Update package error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE package
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
    const packageId = id

    // Check if there are clients associated with this package
    const clientsWithPackage = await prisma.client.count({
      where: { packageId }
    })

    if (clientsWithPackage > 0) {
      return NextResponse.json(
        { error: 'Cannot delete package with associated clients' },
        { status: 400 }
      )
    }

    await prisma.package.delete({
      where: { id: packageId }
    })

    return NextResponse.json({ message: 'Package deleted successfully' })
  } catch (error) {
    console.error('Delete package error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


// import { NextResponse } from 'next/server'
//   import { getAdminFromToken } from '@/lib/jwt'
//   import prisma from '@/lib/prisma'

//   export async function PUT(request: Request, { params }: { params: { id: string } }) {
//     try {
//       const admin = await getAdminFromToken(request as any)

//       if (!admin) {
//         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//       }

//       const packageId = params.id
//       const { name, speed, price, durationDays } = await request.json()

//       const updatedPackage = await prisma.package.update({
//         where: { id: packageId },
//         data: {
//           name,
//           speed,
//           price,
//           durationDays
//         }
//       })

//       return NextResponse.json(updatedPackage)
//     } catch (error) {
//       console.error('Update package error:', error)
//       return NextResponse.json(
//         { error: 'Internal server error' },
//         { status: 500 }
//       )
//     }
//   }

//   export async function DELETE(request: Request, { params }: { params: { id: string } }) {
//     try {
//       const admin = await getAdminFromToken(request as any)

//       if (!admin) {
//         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//       }

//       const packageId = params.id

//       // Check if there are clients associated with this package
//       const clientsWithPackage = await prisma.client.count({
//         where: { packageId }
//       })

//       if (clientsWithPackage > 0) {
//         return NextResponse.json(
//           { error: 'Cannot delete package with associated clients' },
//           { status: 400 }
//         )
//       }

//       await prisma.package.delete({
//         where: { id: packageId }
//       })

//       return NextResponse.json({ message: 'Package deleted successfully' })
//     } catch (error) {
//       console.error('Delete package error:', error)
//       return NextResponse.json(
//         { error: 'Internal server error' },
//         { status: 500 }
//       )
//     }
//   }