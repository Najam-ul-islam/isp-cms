import { NextRequest, NextResponse } from 'next/server';
import { getDailyReport, getMonthlyReport, getExpiryReport, getPaymentStatusReport, getAreaReport } from '../../../modules/reports/services/report.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type');
    const dateStr = searchParams.get('date'); // Format: YYYY-MM-DD
    const monthStr = searchParams.get('month'); // Format: MM
    const yearStr = searchParams.get('year'); // Format: YYYY

    switch (reportType) {
      case 'daily':
        if (!dateStr) {
          return NextResponse.json(
            { error: 'Date parameter is required for daily report' },
            { status: 400 }
          );
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          return NextResponse.json(
            { error: 'Invalid date format. Expected YYYY-MM-DD' },
            { status: 400 }
          );
        }

        const dailyReport = await getDailyReport(date);
        return NextResponse.json(dailyReport);

      case 'monthly':
        if (!monthStr || !yearStr) {
          return NextResponse.json(
            { error: 'Month and year parameters are required for monthly report' },
            { status: 400 }
          );
        }

        const month = parseInt(monthStr, 10);
        const year = parseInt(yearStr, 10);

        if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
          return NextResponse.json(
            { error: 'Invalid month or year format' },
            { status: 400 }
          );
        }

        const monthlyReport = await getMonthlyReport(month, year);
        return NextResponse.json(monthlyReport);

      case 'expiry':
        const expiryReport = await getExpiryReport();
        return NextResponse.json(expiryReport);

      case 'payment-status':
        const paymentStatusReport = await getPaymentStatusReport();
        return NextResponse.json(paymentStatusReport);

      case 'area':
        const areaReport = await getAreaReport();
        return NextResponse.json(areaReport);

      default:
        return NextResponse.json(
          { error: 'Invalid report type. Supported types: daily, monthly, expiry, payment-status, area' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}