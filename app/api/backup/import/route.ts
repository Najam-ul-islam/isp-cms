import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { importBackup } from '../../../../modules/backup/services';

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

    // Parse the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
      return NextResponse.json(
        { error: 'Only JSON files are supported for backup import' },
        { status: 400 }
      );
    }

    // Read and parse the file
    const fileText = await file.text();
    let backupData;

    try {
      backupData = JSON.parse(fileText);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON format in uploaded file' },
        { status: 400 }
      );
    }

    // Extract the actual data if it's wrapped
    if (backupData.data) {
      backupData = backupData.data;
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
    console.error('Import backup from file error:', error);
    return NextResponse.json(
      { error: 'Internal server error during import' },
      { status: 500 }
    );
  }
}