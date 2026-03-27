import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { exportBackup, importBackup, backupToCsv } from '../../../modules/backup/services';
import { Readable } from 'stream';

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to export data
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    // Determine export format
    const format = searchParams.get('format') || 'json'; // 'json' or 'csv'

    // Determine which data to include
    const options = {
      includeClients: searchParams.get('includeClients') !== 'false',
      includePayments: searchParams.get('includePayments') !== 'false',
      includeExpenses: searchParams.get('includeExpenses') !== 'false',
      includeComplaints: searchParams.get('includeComplaints') !== 'false',
      includePackages: searchParams.get('includePackages') !== 'false',
      includeAreas: searchParams.get('includeAreas') !== 'false',
      includeLedgers: searchParams.get('includeLedgers') !== 'false',
      includeTransactions: searchParams.get('includeTransactions') !== 'false',
    };

    const backupData = await exportBackup(admin, options);

    if (format.toLowerCase() === 'csv') {
      const csvData = await backupToCsv(backupData);

      // Create a combined CSV response or separate files
      // For simplicity, returning JSON with CSV strings
      return NextResponse.json({
        format: 'csv',
        data: csvData,
        timestamp: new Date().toISOString()
      });
    } else {
      // Default to JSON format
      return NextResponse.json({
        format: 'json',
        data: backupData,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Export backup error:', error);
    return NextResponse.json(
      { error: 'Internal server error during export' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to import data
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { data: backupData } = body;

    if (!backupData) {
      return NextResponse.json(
        { error: 'Backup data is required' },
        { status: 400 }
      );
    }

    const result = await importBackup(admin, backupData);

    if (result.success) {
      return NextResponse.json({
        message: result.message,
        importedCounts: result.importedCounts
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Import backup error:', error);
    return NextResponse.json(
      { error: 'Internal server error during import' },
      { status: 500 }
    );
  }
}