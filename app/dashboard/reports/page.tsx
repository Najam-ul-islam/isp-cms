'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('');
  const [date, setDate] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();

  const fetchReport = async () => {
    if (!selectedReport) {
      setError('Please select a report type');
      return;
    }

    setLoading(true);
    setError('');
    setReportData(null);

    try {
      let url = `/api/reports?type=${selectedReport}`;

      if (selectedReport === 'daily' && date) {
        url += `&date=${date}`;
      } else if (selectedReport === 'monthly' && month && year) {
        url += `&month=${month}&year=${year}`;
      }

      // Check if user is authenticated by making a simple API call
      const authCheck = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include' // This ensures cookies are sent with the request
      });

      if (authCheck.status === 401) {
        router.push('/login');
        return;
      }

      const response = await fetch(url, {
        credentials: 'include', // This ensures cookies are sent with the request
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSample = (type: string) => {
    setSelectedReport(type);
    setReportData(null);

    // Set sample data based on report type
    switch (type) {
      case 'expiry':
        setReportData({
          expiringToday: 5,
          expiringThisWeek: 12,
          expiringThisMonth: 28,
          expired: 3
        });
        break;
      case 'payment-status':
        setReportData({
          paid: 45,
          unpaid: 8,
          partiallyPaid: 3
        });
        break;
      case 'area':
        setReportData({
          'Karachi': { totalClients: 25, activeClients: 20, expiredClients: 5 },
          'Lahore': { totalClients: 18, activeClients: 16, expiredClients: 2 },
          'Islamabad': { totalClients: 12, activeClients: 11, expiredClients: 1 }
        });
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Generate and view business reports</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Report</option>
              <option value="daily">Daily Report</option>
              <option value="monthly">Monthly Report</option>
              <option value="expiry">Expiry Report</option>
              <option value="payment-status">Payment Status Report</option>
              <option value="area">Area-wise Report</option>
            </select>
          </div>

          {selectedReport === 'daily' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {selectedReport === 'monthly' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Month</option>
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="YYYY"
                />
              </div>
            </>
          )}

          <div className="flex items-end">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Sample Reports Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Quick Sample Reports</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleViewSample('expiry')}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
            >
              Expiry Report
            </button>
            <button
              onClick={() => handleViewSample('payment-status')}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
            >
              Payment Status
            </button>
            <button
              onClick={() => handleViewSample('area')}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
            >
              Area-wise Report
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {reportData && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Report Results</h3>

            {reportData && (selectedReport === 'expiry' || Object.keys(reportData).includes('expiringToday')) ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="text-sm font-medium text-blue-800">Expiring Today</h4>
                  <p className="text-2xl font-bold text-blue-600">{reportData.expiringToday}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                  <h4 className="text-sm font-medium text-amber-800">This Week</h4>
                  <p className="text-2xl font-bold text-amber-600">{reportData.expiringThisWeek}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <h4 className="text-sm font-medium text-purple-800">This Month</h4>
                  <p className="text-2xl font-bold text-purple-600">{reportData.expiringThisMonth}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <h4 className="text-sm font-medium text-red-800">Expired</h4>
                  <p className="text-2xl font-bold text-red-600">{reportData.expired}</p>
                </div>
              </div>
            ) : null}

            {reportData && (selectedReport === 'payment-status' || Object.keys(reportData).includes('paid')) ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <h4 className="text-sm font-medium text-green-800">Paid</h4>
                  <p className="text-2xl font-bold text-green-600">{reportData.paid}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <h4 className="text-sm font-medium text-red-800">Unpaid</h4>
                  <p className="text-2xl font-bold text-red-600">{reportData.unpaid}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                  <h4 className="text-sm font-medium text-yellow-800">Partially Paid</h4>
                  <p className="text-2xl font-bold text-yellow-600">{reportData.partiallyPaid}</p>
                </div>
              </div>
            ) : null}

            {reportData && (selectedReport === 'area' || (typeof reportData === 'object' && Object.keys(reportData).some(key => typeof reportData[key] === 'object'))) ? (
              <div className="mt-4">
                <h4 className="font-medium text-gray-700 mb-3">Area-wise Distribution</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Clients</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expired</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(reportData).map(([area, data]: [string, any]) => (
                        <tr key={area}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{area}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.totalClients}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.activeClients}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.expiredClients}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {selectedReport === 'daily' && reportData.date && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-700 mb-3">Daily Report for {reportData.date}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h5 className="text-sm font-medium text-gray-600">Total Clients</h5>
                    <p className="text-2xl font-bold text-gray-900">{reportData.totalClients}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h5 className="text-sm font-medium text-gray-600">New Clients</h5>
                    <p className="text-2xl font-bold text-blue-600">{reportData.newClients}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h5 className="text-sm font-medium text-gray-600">Total Payments</h5>
                    <p className="text-2xl font-bold text-green-600">Rs. {reportData.totalPayments?.toLocaleString('en-PK')}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'monthly' && reportData.month && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-700 mb-3">Monthly Report for {reportData.month} {reportData.year}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h5 className="text-sm font-medium text-gray-600">Total Clients</h5>
                    <p className="text-2xl font-bold text-gray-900">{reportData.totalClients}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h5 className="text-sm font-medium text-gray-600">New Clients</h5>
                    <p className="text-2xl font-bold text-blue-600">{reportData.newClients}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h5 className="text-sm font-medium text-gray-600">Total Revenue</h5>
                    <p className="text-2xl font-bold text-green-600">Rs. {reportData.totalPayments?.toLocaleString('en-PK')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}