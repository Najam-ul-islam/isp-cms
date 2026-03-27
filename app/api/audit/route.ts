import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { getAuditLogs, searchAuditLogs, countAuditLogs } from '../../../modules/audit/services';

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view audit logs
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page
    const offset = (page - 1) * limit;

    const searchTerm = searchParams.get('search') || undefined;
    const action = searchParams.get('action') || undefined;
    const entity = searchParams.get('entity') || undefined;

    const dateFromStr = searchParams.get('dateFrom');
    const dateToStr = searchParams.get('dateTo');

    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
    const dateTo = dateToStr ? new Date(dateToStr) : undefined;

    let auditLogs;

    if (searchTerm || action || entity || dateFrom || dateTo) {
      // Use search if any filter is provided
      auditLogs = await searchAuditLogs(
        admin,
        searchTerm,
        action,
        entity,
        dateFrom,
        dateTo,
        limit,
        offset
      );
    } else {
      // Otherwise get all logs with pagination
      auditLogs = await getAuditLogs(admin, limit, offset);
    }

    // Get total count for pagination metadata
    const totalCount = await countAuditLogs(
      admin,
      searchTerm,
      action,
      entity,
      dateFrom,
      dateTo
    );

    return NextResponse.json({
      data: auditLogs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}