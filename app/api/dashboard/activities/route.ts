import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { getRecentPayments } from '../../../../modules/payments/services';
import { getRecentClients } from '../../../../modules/clients/services';
import { getRecentComplaints } from '../../../../modules/complaints/services/complaint.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to access activities
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get recent activities from different modules
    const [recentPayments, recentClients, recentComplaints] = await Promise.all([
      getRecentPayments(admin, 5),
      getRecentClients(admin, 5),
      getRecentComplaints(admin, 5)
    ]);

    // Define types for activities
    interface ActivityItem {
      id: string;
      type: 'payment' | 'client' | 'complaint';
      title: string;
      description: string;
      timestamp: Date;
      status?: string;
    }

    // Combine and sort activities by timestamp
    const activities: ActivityItem[] = [
      ...recentPayments.map(payment => ({
        id: payment.id,
        type: 'payment' as const,
        title: `Payment received`,
        description: `Rs ${payment.amount} from ${payment.client.name}`,
        timestamp: new Date(payment.paymentDate),
        status: payment.method || undefined
      })),
      ...recentClients.map(client => ({
        id: client.id,
        type: 'client' as const,
        title: `New client registered`,
        description: `${client.name}`,
        timestamp: new Date(client.createdAt)
      })),
      ...recentComplaints.map(complaint => ({
        id: complaint.id,
        type: 'complaint' as const,
        title: `New complaint filed`,
        description: `${complaint.title}`,
        timestamp: new Date(complaint.createdAt),
        status: complaint.status || undefined
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Return only the most recent 10 activities
    return NextResponse.json(activities.slice(0, 10));
  } catch (error) {
    console.error('Activities API error:', error);
    return NextResponse.json(
      { error: 'Failed to load activities' },
      { status: 500 }
    );
  }
}