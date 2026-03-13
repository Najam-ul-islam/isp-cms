'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Client, Package, ServiceProvider, ClientStatus, PaymentStatus } from '@prisma/client';

interface ClientWithPackage extends Client {
  package: Package & {
    serviceProvider?: ServiceProvider | null;
  };
}

export default function EditClientPage() {
  const { id } = useParams();
  const router = useRouter();

  const [client, setClient] = useState<ClientWithPackage | null>(null);
  const [packages, setPackages] = useState<(Package & { serviceProvider?: ServiceProvider | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [country, setCountry] = useState('');
  const [packageId, setPackageId] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [status, setStatus] = useState<ClientStatus>('active');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch client data
        const clientRes = await fetch(`/api/clients/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!clientRes.ok) {
          if (clientRes.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch client');
        }

        const clientData: ClientWithPackage = await clientRes.json();

        // Set form fields with client data, with null checks and proper date handling
        setName(clientData.name || '');
        setPhone(clientData.phone || '');
        setCnic(clientData.cnic || '');
        setCity(clientData.city || '');
        setArea(clientData.area || '');
        setCountry(clientData.country || '');
        setPackageId(clientData.packageId || '');
        setPrice(clientData.price || 0);

        // Handle dates - they come as Date objects from Prisma but may need proper formatting
        let startDateStr = '';
        if (clientData.startDate) {
          const startDateObj = new Date(clientData.startDate);
          if (!isNaN(startDateObj.getTime())) { // Check if it's a valid date
            startDateStr = startDateObj.toISOString().split('T')[0];
          }
        }
        setStartDate(startDateStr);

        let expiryDateStr = '';
        if (clientData.expiryDate) {
          const expiryDateObj = new Date(clientData.expiryDate);
          if (!isNaN(expiryDateObj.getTime())) { // Check if it's a valid date
            expiryDateStr = expiryDateObj.toISOString().split('T')[0];
          }
        }
        setExpiryDate(expiryDateStr);

        setPaymentStatus(clientData.paymentStatus || 'unpaid');
        setStatus(clientData.status || 'active');
        setNotes(clientData.notes || '');

        setClient(clientData);

        // Fetch all packages with service provider info
        const packagesRes = await fetch('/api/packages', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!packagesRes.ok) {
          if (packagesRes.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch packages');
        }

        // Packages data with service provider info
        const packagesData = await packagesRes.json();
        setPackages(packagesData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  // Clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          phone,
          cnic,
          city,
          area,
          country,
          packageId,
          price: typeof price === 'string' ? parseFloat(price) : price,
          startDate,
          expiryDate,
          paymentStatus,
          status,
          notes: notes || null
        })
      });

      if (res.ok) {
        setNotification({ type: 'success', message: 'Client updated successfully' });
        setTimeout(() => {
          router.push('/dashboard/clients');
        }, 1500); // Wait a moment to show success message before redirecting
      } else {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const errorData = await res.json();
        setNotification({ type: 'error', message: errorData.error || 'Failed to update client' });
      }
    } catch (err) {
      console.error('Error updating client:', err);
      setError('An error occurred while updating the client');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error! </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Client</h1>

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            {error}
          </div>
        )}

        {notification && (
          <div className={`
            mb-4 px-4 py-3 rounded-lg flex items-center gap-3
            ${notification.type === 'success'
              ? 'bg-emerald-100 border border-emerald-200 text-emerald-700'
              : notification.type === 'error'
              ? 'bg-red-100 border border-red-200 text-red-700'
              : 'bg-blue-100 border border-blue-200 text-blue-700'}
          `}>
            {notification.type === 'success' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {notification.type === 'error' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span>{notification.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
              Phone *
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          {/* CNIC */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cnic">
              CNIC *
            </label>
            <input
              id="cnic"
              type="text"
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="city">
              City *
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          {/* Area */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="area">
              Area
            </label>
            <input
              id="area"
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="country">
              Country *
            </label>
            <input
              id="country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          {/* Package */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="package">
              Package *
            </label>
            <select
              id="package"
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">Select a package</option>
              {packages.map(pkg => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} ({pkg.speed} Mbps) - ${pkg.price.toFixed(2)} {pkg.serviceProvider ? `(${pkg.serviceProvider.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="price">
              Price *
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="startDate">
              Start Date *
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="expiryDate">
              Expiry Date *
            </label>
            <input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="paymentStatus">
              Payment Status *
            </label>
            <select
              id="paymentStatus"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">
              Status *
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ClientStatus)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            ></textarea>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Update Client
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}