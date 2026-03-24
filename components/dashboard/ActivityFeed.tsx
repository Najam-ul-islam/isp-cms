'use client';

import { useEffect, useState } from 'react';
import {
  CreditCard,
  UserPlus,
  MessageCircle,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'payment' | 'client' | 'complaint';
  title: string;
  description: string;
  timestamp: Date;
  status?: string;
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
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

        const response = await fetch('/api/dashboard/activities', {
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
          throw new Error(`Failed to fetch activities: ${response.status}`);
        }

        const data = await response.json();

        // Convert string timestamps to Date objects
        const activitiesWithDates = data.map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp)
        }));

        setActivities(activitiesWithDates);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    // Refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment': return <CreditCard className="w-4 h-4 text-green-600" />;
      case 'client': return <UserPlus className="w-4 h-4 text-blue-600" />;
      case 'complaint': return <MessageCircle className="w-4 h-4 text-amber-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'payment': return 'bg-green-50 border-green-200';
      case 'client': return 'bg-blue-50 border-blue-200';
      case 'complaint': return 'bg-amber-50 border-amber-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 animate-pulse">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activities</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-center gap-3 p-3 bg-slate-100 rounded-lg">
              <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-3 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-slate-200 rounded w-1/2"></div>
              </div>
              <div className="h-3 bg-slate-200 rounded w-10"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activities</h3>
      <div className="space-y-3">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${getActivityColor(activity.type)}`}
            >
              <div className="mt-0.5">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{activity.title}</p>
                <p className="text-sm text-slate-600 truncate">{activity.description}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">
                  {activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-slate-400">
                  {activity.timestamp.toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-slate-500">
            No recent activities
          </div>
        )}
      </div>
    </div>
  );
}