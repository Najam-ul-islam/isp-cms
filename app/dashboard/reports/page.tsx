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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Reports
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">Generate and view business reports</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Report Type</label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
              />
            </div>
          )}

          {selectedReport === 'monthly' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                  placeholder="YYYY"
                />
              </div>
            </>
          )}

          <div className="flex items-end">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Sample Reports Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Quick Sample Reports</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleViewSample('expiry')}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm transition-all duration-200 hover:shadow-md"
            >
              Expiry Report
            </button>
            <button
              onClick={() => handleViewSample('payment-status')}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm transition-all duration-200 hover:shadow-md"
            >
              Payment Status
            </button>
            <button
              onClick={() => handleViewSample('area')}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm transition-all duration-200 hover:shadow-md"
            >
              Area-wise Report
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {reportData && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Report Results</h3>

            {reportData && (selectedReport === 'expiry' || Object.keys(reportData).includes('expiringToday')) ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 p-5 rounded-2xl border border-blue-200/60 dark:border-blue-700/50">
                  <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300">Expiring Today</h4>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{reportData.expiringToday}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-800/20 p-5 rounded-2xl border border-amber-200/60 dark:border-amber-700/50">
                  <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300">This Week</h4>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{reportData.expiringThisWeek}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/30 dark:to-purple-800/20 p-5 rounded-2xl border border-purple-200/60 dark:border-purple-700/50">
                  <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300">This Month</h4>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{reportData.expiringThisMonth}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-800/20 p-5 rounded-2xl border border-red-200/60 dark:border-red-700/50">
                  <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">Expired</h4>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{reportData.expired}</p>
                </div>
              </div>
            ) : null}

            {reportData && (selectedReport === 'payment-status' || Object.keys(reportData).includes('paid')) ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 p-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-700/50">
                  <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Paid</h4>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{reportData.paid}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-800/20 p-5 rounded-2xl border border-red-200/60 dark:border-red-700/50">
                  <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">Unpaid</h4>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{reportData.unpaid}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-800/20 p-5 rounded-2xl border border-amber-200/60 dark:border-amber-700/50">
                  <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300">Partially Paid</h4>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{reportData.partiallyPaid}</p>
                </div>
              </div>
            ) : null}

            {reportData && (selectedReport === 'area' || (typeof reportData === 'object' && Object.keys(reportData).some(key => typeof reportData[key] === 'object'))) ? (
              <div className="mt-6">
                <h4 className="font-semibold text-slate-800 dark:text-white mb-4">Area-wise Distribution</h4>
                <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-2xl border border-slate-200/60 dark:border-gray-700">
                  <table className="min-w-full divide-y divide-slate-200/60 dark:divide-gray-700">
                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-gray-900/50 dark:to-gray-800/30">
                      <tr>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Area</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Total Clients</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Active</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Expired</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-slate-200/60 dark:divide-gray-700">
                      {Object.entries(reportData).map(([area, data]: [string, any]) => (
                        <tr key={area} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent dark:hover:from-blue-900/20 dark:hover:to-transparent transition-all">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-white">{area}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-gray-300">{data.totalClients}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 dark:text-emerald-400 font-medium">{data.activeClients}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-medium">{data.expiredClients}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {selectedReport === 'daily' && reportData.date && (
              <div className="mt-6">
                <h4 className="font-semibold text-slate-800 dark:text-white mb-4">Daily Report for {reportData.date}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 p-5 rounded-2xl border border-blue-200/60 dark:border-blue-700/50">
                    <h5 className="text-sm font-semibold text-blue-700 dark:text-blue-300">Total Clients</h5>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{reportData.totalClients}</p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/30 dark:to-indigo-800/20 p-5 rounded-2xl border border-indigo-200/60 dark:border-indigo-700/50">
                    <h5 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">New Clients</h5>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{reportData.newClients}</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 p-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-700/50">
                    <h5 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Total Payments</h5>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">Rs. {reportData.totalPayments?.toLocaleString('en-PK')}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'monthly' && reportData.month && (
              <div className="mt-6">
                <h4 className="font-semibold text-slate-800 dark:text-white mb-4">Monthly Report for {reportData.month} {reportData.year}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 p-5 rounded-2xl border border-blue-200/60 dark:border-blue-700/50">
                    <h5 className="text-sm font-semibold text-blue-700 dark:text-blue-300">Total Clients</h5>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{reportData.totalClients}</p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/30 dark:to-indigo-800/20 p-5 rounded-2xl border border-indigo-200/60 dark:border-indigo-700/50">
                    <h5 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">New Clients</h5>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{reportData.newClients}</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 p-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-700/50">
                    <h5 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Total Revenue</h5>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">Rs. {reportData.totalPayments?.toLocaleString('en-PK')}</p>
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