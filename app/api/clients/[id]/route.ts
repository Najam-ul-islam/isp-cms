import { NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/jwt'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET single client with package info
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request as any)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const clientId = id

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        package: {
          include: {
            serviceProvider: true
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Get client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// UPDATE client
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request as any)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const clientId = id

    const {
      name,
      phone,
      cnic,
      city,
      area,
      country,
      packageId,
      price,
      startDate,
      expiryDate,
      paymentStatus,
      status,
      notes
    } = await request.json()

    // Validate required fields for update
    if (!name || !phone || !cnic || !city || !area || !country || !packageId || !price || !startDate || !expiryDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Parse dates safely
    let parsedStartDate: Date | undefined;
    let parsedExpiryDate: Date | undefined;

    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start date format' },
          { status: 400 }
        );
      }
    }

    if (expiryDate) {
      parsedExpiryDate = new Date(expiryDate);
      if (isNaN(parsedExpiryDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiry date format' },
          { status: 400 }
        );
      }
    }

    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        name,
        phone,
        cnic,
        city,
        area,
        country,
        packageId,
        price: typeof price === 'string' ? parseFloat(price) : price,
        startDate: parsedStartDate,
        expiryDate: parsedExpiryDate,
        paymentStatus,
        status,
        notes: notes || null
      }
    })

    return NextResponse.json(updatedClient)
  } catch (error) {
    console.error('Update client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE client
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request as any)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const clientId = id

    await prisma.client.delete({
      where: { id: clientId }
    })

    return NextResponse.json({ message: 'Client deleted successfully' })
  } catch (error) {
    console.error('Delete client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


// import { NextResponse } from 'next/server'
// import { getAdminFromToken } from '@/lib/jwt'
// import prisma from '@/lib/prisma'

// export const dynamic = 'force-dynamic'

// // GET single client with package info
// export async function GET(request: Request, { params }: { params: { id: string } }) {
//   try {
//     const admin = await getAdminFromToken(request as any)

//     if (!admin) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     const clientId = params.id

//     const client = await prisma.client.findUnique({
//       where: { id: clientId },
//       include: {
//         package: true
//       }
//     })

//     if (!client) {
//       return NextResponse.json({ error: 'Client not found' }, { status: 404 })
//     }

//     return NextResponse.json(client)
//   } catch (error) {
//     console.error('Get client error:', error)
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     )
//   }
// }

// export async function PUT(request: Request, { params }: { params: { id: string } }) {
//     try {
//       const admin = await getAdminFromToken(request as any)

//       if (!admin) {
//         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//       }

//       const clientId = params.id
//       const {
//         name,
//         phone,
//         cnic,
//         city,
//         country,
//         packageId,
//         price,
//         startDate,
//         expiryDate,
//         paymentStatus,
//         status,
//         notes
//       } = await request.json()

//       const updatedClient = await prisma.client.update({
//         where: { id: clientId },
//         data: {
//           name,
//           phone,
//           cnic,
//           city,
//           country,
//           packageId,
//           price,
//           startDate: new Date(startDate),
//           expiryDate: new Date(expiryDate),
//           paymentStatus,
//           status,
//           notes: notes || null
//         }
//       })

//       return NextResponse.json(updatedClient)
//     } catch (error) {
//       console.error('Update client error:', error)
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

//       const clientId = params.id

//       await prisma.client.delete({
//         where: { id: clientId }
//       })

//       return NextResponse.json({ message: 'Client deleted successfully' })
//     } catch (error) {
//       console.error('Delete client error:', error)
//       return NextResponse.json(
//         { error: 'Internal server error' },
//         { status: 500 }
//       )
//     }
//   }