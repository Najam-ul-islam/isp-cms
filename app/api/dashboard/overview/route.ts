import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { getDashboardStats } from '../../../../modules/dashboard/services';
import { getRecentPayments } from '../../../../modules/payments/services';
import { getRecentClients } from '../../../../modules/clients/services';
import { getRecentComplaints } from '../../../../modules/complaints/services';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to access dashboard overview
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all dashboard data
    const [stats, recentPayments, recentClients, recentComplaints] = await Promise.all([
      getDashboardStats(),
      getRecentPayments(5),
      getRecentClients(5),
      getRecentComplaints(5)
    ]);

    interface Activity {
      id: string;
      type: 'payment' | 'client' | 'complaint';
      title: string;
      description: string;
      timestamp: Date;
      status?: string;
    }

    interface Overview {
      [key: string]: unknown;
      recentActivities: Activity[];
    }

    interface PaymentActivity extends Activity {
      type: 'payment';
      status: string;
    }

    interface ClientActivity extends Activity {
      type: 'client';
    }

    interface ComplaintActivity extends Activity {
      type: 'complaint';
      status: string;
    }

    const overview: Overview = {
      ...stats,
      recentActivities: [
      ...recentPayments.map((payment: any): PaymentActivity => ({
      id: payment.id,
      type: 'payment' as const,
      title: `Payment received`,
      description: `Rs ${payment.amount} from ${payment.client?.name || 'Unknown Client'}`,
      timestamp: payment.paymentDate || payment.createdAt,
      status: payment.method || 'N/A'
      })),
      ...recentClients.map((client: { id: any; name: any; createdAt: any; }): ClientActivity => ({
      id: client.id,
      type: 'client' as const,
      title: `New client registered`,
      description: `${client.name}`,
      timestamp: client.createdAt
      })),
      ...recentComplaints.map((complaint: { id: any; title: any; createdAt: any; status: any; }): ComplaintActivity => ({
      id: complaint.id,
      type: 'complaint' as const,
      title: `New complaint filed`,
      description: `${complaint.title}`,
      timestamp: complaint.createdAt,
      status: complaint.status
      }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)
    };

    return NextResponse.json(overview);
  } catch (error) {
    console.error('Dashboard overview error:', error);
    return NextResponse.json(
      { error: 'Failed to load overview' },
      { status: 500 }
    );
  }
}