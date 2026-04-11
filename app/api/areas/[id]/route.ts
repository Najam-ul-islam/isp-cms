import { NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'

// DELETE /api/areas/[id] - Delete an area
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Find the area and verify it belongs to the admin's company
    const area = await prisma.area.findFirst({
      where: {
        id,
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

    if (!area) {
      return NextResponse.json(
        { error: 'Area not found' },
        { status: 404 }
      )
    }

    // Check if area has linked clients
    if (area._count.clients > 0) {
      return NextResponse.json(
        { error: `Cannot delete area "${area.name}". It has ${area._count.clients} client(s) assigned to it.` },
        { status: 400 }
      )
    }

    // Delete the area
    await prisma.area.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete area error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
