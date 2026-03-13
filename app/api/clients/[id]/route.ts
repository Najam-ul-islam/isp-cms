import { NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/jwt'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET single client with package info
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
  { params }: { params: Promise<{ id: string }> }  // ✅ params is now a Promise
) {
  try {
    const admin = await getAdminFromToken(request as any)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params  // ✅ Await params
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
        price,
        startDate: startDate ? new Date(startDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
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
  { params }: { params: Promise<{ id: string }> }  // ✅ params is now a Promise
) {
  try {
    const admin = await getAdminFromToken(request as any)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params  // ✅ Await params
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