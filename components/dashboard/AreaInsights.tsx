'use client';

import { useEffect, useState } from 'react';
import { MapPin, Users, UserCheck, UserX } from 'lucide-react';
import { AreaInsight } from '@/modules/areas/types/area.types';

export default function AreaInsights() {
  const [insights, setInsights] = useState<AreaInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        // Get token from localStorage first, then from cookies if not found
        let token = localStorage.getItem('token');
        if (!token) {
          // Extract token from cookies
          const cookies = document.cookie.split(';');
          for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'token') {
              token = value;
              break;
            }
          }
        }

        if (!token) {
          // Redirect to login if no token found
          window.location.href = '/login';
          return;
        }

        const response = await fetch('/api/dashboard/area-insights', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Redirect to login if unauthorized
            window.location.href = '/login';
            return;
          }
          throw new Error(`Failed to fetch area insights: ${response.status}`);
        }

        const data = await response.json();
        setInsights(data);
      } catch (error) {
        console.error('Error fetching area insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();

    // Refresh every 60 seconds
    const interval = setInterval(fetchInsights, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 animate-pulse">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Area Insights</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex justify-between items-center p-3 bg-slate-100 rounded-lg">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-6 bg-slate-200 rounded w-1/6"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Area Insights</h3>
      <div className="space-y-3">
        {insights.length > 0 ? (
          insights.map((area, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-slate-700">{area.areaName}</span>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-600">{area.totalClients}</span>
                </div>
                <div className="flex items-center gap-1">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">{area.activeClients}</span>
                </div>
                <div className="flex items-center gap-1">
                  <UserX className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600">{area.expiredClients}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-slate-500">
            No area data available
          </div>
        )}
      </div>
    </div>
  );
}