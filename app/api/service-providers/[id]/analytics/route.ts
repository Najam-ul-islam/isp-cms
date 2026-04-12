import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/service-providers/[id]/analytics
 * 
 * Returns comprehensive analytics for a service provider:
 * - Total packages linked to provider
 * - Active users (clients using provider's packages)
 * - Expired users (clients using provider's packages)
 * - Total recharge amount (successful payments)
 * - Average package purchase price
 * - Bonus: Revenue trends, package distribution, top clients
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let providerId = '';
  let admin: Awaited<ReturnType<typeof getAdminFromToken>> | null = null;

  try {
    admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'].includes(admin.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const paramsData = await params;
    providerId = paramsData.id;
    const companyId = admin.companyId;
    const isSuperAdmin = admin.role === 'SUPER_ADMIN';

    console.log('📊 Analytics Request:', {
      providerId,
      adminCompanyId: companyId,
      adminId: admin.id,
      adminRole: admin.role,
      isSuperAdmin,
    });

    // Company filter: SUPER_ADMIN can access all, others restricted to their company
    const companyFilter = isSuperAdmin ? {} : { companyId };

    // Verify provider exists and belongs to this company (multi-tenant security)
    // SUPER_ADMIN can access all providers, others are restricted to their company
    const provider = await prisma.serviceProvider.findFirst({
      where: {
        id: providerId,
        ...companyFilter,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        contactInfo: true,
        email: true,
        phone: true,
        address: true,
        _count: {
          select: { packages: true }
        }
      }
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Service provider not found' },
        { status: 404 }
      );
    }

    // Execute all analytics queries in parallel for performance
    const [
      // Core metrics
      packagesStats,
      activeUsers,
      expiredUsers,
      totalRecharge,
      avgPurchasePrice,
      
      // Bonus: Revenue trend (last 30 days)
      revenueLast30Days,
      revenuePrevious30Days,
      
      // Bonus: Package distribution
      packageDistribution,
      
      // Bonus: Top clients by payment amount
      topClients,
      
      // Bonus: Payment statistics
      paymentStats,
    ] = await Promise.all([
      // 1. Total Packages
      prisma.package.aggregate({
        _count: { id: true },
        _sum: { price: true },
        where: {
          serviceProviderId: providerId,
          ...companyFilter,
        },
      }),

      // 2. Active Users
      prisma.client.count({
        where: {
          status: 'active',
          ...companyFilter,
          package: {
            is: {
              serviceProviderId: providerId,
            },
          },
        },
      }),

      // 3. Expired Users
      prisma.client.count({
        where: {
          status: 'expired',
          ...companyFilter,
          package: {
            is: {
              serviceProviderId: providerId,
            },
          },
        },
      }),

      // 4. Total Recharge Amount (all successful payments)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'success',
          ...companyFilter,
          client: {
            is: {
              package: {
                is: {
                  serviceProviderId: providerId,
                },
              },
            },
          },
        },
      }),

      // 5. Average Package Purchase Price
      prisma.package.aggregate({
        _avg: { purchasePrice: true },
        _sum: { purchasePrice: true },
        where: {
          serviceProviderId: providerId,
          ...companyFilter,
          purchasePrice: { not: null },
        },
      }),

      // Bonus: Revenue trend - Last 30 days
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: {
          status: 'success',
          ...companyFilter,
          paymentDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
          client: {
            is: {
              package: {
                is: {
                  serviceProviderId: providerId,
                },
              },
            },
          },
        },
      }),

      // Bonus: Revenue trend - Previous 30 days (for comparison)
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: {
          status: 'success',
          ...companyFilter,
          paymentDate: {
            gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
          client: {
            is: {
              package: {
                is: {
                  serviceProviderId: providerId,
                },
              },
            },
          },
        },
      }),

      // Bonus: Package distribution by price range
      prisma.package.groupBy({
        by: ['isActive'],
        _count: { id: true },
        _sum: { price: true },
        _avg: { price: true },
        where: {
          serviceProviderId: providerId,
          companyId,
        },
      }),

      // Bonus: Top 10 clients by total payment amount
      prisma.payment.groupBy({
        by: ['clientId'],
        _sum: { amount: true },
        _count: { id: true },
        where: {
          status: 'success',
          ...companyFilter,
          client: {
            is: {
              package: {
                is: {
                  serviceProviderId: providerId,
                },
              },
            },
          },
        },
        orderBy: {
          _sum: { amount: 'desc' },
        },
        take: 10,
      }),

      // Bonus: Payment statistics
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: {
          ...companyFilter,
          client: {
            is: {
              package: {
                is: {
                  serviceProviderId: providerId,
                },
              },
            },
          },
        },
      }),
    ]);

    // Fetch top clients details
    const topClientsDetails = await Promise.all(
      topClients.map(async (payment) => {
        const client = await prisma.client.findUnique({
          where: { id: payment.clientId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            package: {
              select: {
                name: true,
                price: true,
              },
            },
          },
        });
        return client ? {
          ...client,
          totalPaid: payment._sum.amount || 0,
          paymentCount: payment._count.id,
        } : null;
      })
    );

    // Calculate revenue change percentage
    const currentRevenue = revenueLast30Days._sum.amount || 0;
    const previousRevenue = revenuePrevious30Days._sum.amount || 0;
    const revenueChangePercent = previousRevenue !== 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    const response = {
      // Provider info
      provider: {
        id: provider.id,
        name: provider.name,
        isActive: provider.isActive,
        contactInfo: provider.contactInfo,
        email: provider.email,
        phone: provider.phone,
        address: provider.address,
        totalPackages: provider._count.packages,
      },

      // Core metrics
      totalPackages: packagesStats._count.id,
      totalPackageValue: packagesStats._sum.price || 0,
      activeUsers,
      expiredUsers,
      totalRecharge: totalRecharge._sum.amount || 0,
      avgPurchasePrice: avgPurchasePrice._avg.purchasePrice || 0,

      // Revenue trends
      revenueLast30Days: currentRevenue,
      revenuePrevious30Days: previousRevenue,
      revenueChangePercent: Math.round(revenueChangePercent * 100) / 100,
      paymentCountLast30Days: revenueLast30Days._count.id,

      // Package distribution
      packageDistribution: packageDistribution.map(dist => ({
        isActive: dist.isActive,
        count: dist._count.id,
        totalValue: dist._sum.price || 0,
        avgPrice: dist._avg.price || 0,
      })),

      // Top clients
      topClients: topClientsDetails.filter(Boolean),

      // Payment statistics
      totalPayments: paymentStats._count.id,
      totalPaymentVolume: paymentStats._sum.amount || 0,

      // Timestamp
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Provider analytics error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      providerId,
      companyId: admin?.companyId,
    });
    return NextResponse.json(
      { 
        error: 'Failed to load provider analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
