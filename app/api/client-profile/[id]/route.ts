import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import {prisma} from '@/lib/prisma';
import { getComplaintsByClient } from '../../../../modules/complaints/services/complaint.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get client with package information
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        package: {
          include: {
            serviceProvider: true
          }
        }
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get client's payment history
    const payments = await prisma.payment.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' }
    });

    // Get client's complaints
    const complaints = await getComplaintsByClient(id);

    // Calculate statistics
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalDue = client.price - totalPaid;

    // Prepare the response
    const profileData = {
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        cnic: client.cnic,
        city: client.city,
        area: client.area,
        country: client.country,
        package: {
          id: client.package.id,
          name: client.package.name,
          speed: client.package.speed,
          price: client.package.price,
          durationDays: client.package.durationDays,
          serviceProvider: client.package.serviceProvider || null
        },
        price: client.price,
        startDate: client.startDate,
        expiryDate: client.expiryDate,
        paymentStatus: client.paymentStatus,
        status: client.status,
        notes: client.notes,
        createdAt: client.createdAt
      },
      paymentHistory: payments,
      complaints: complaints,
      statistics: {
        totalPaid,
        totalDue,
        paymentCount: payments.length,
        complaintCount: complaints.length
      }
    };

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Get client profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client profile' },
      { status: 500 }
    );
  }
}