'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Client, Package, ServiceProvider } from '@prisma/client';
import Image from 'next/image';

interface ClientWithPackage extends Client {
  package: Package & { serviceProvider?: ServiceProvider | null };
}

interface ExtendedClient extends Omit<ClientWithPackage, 'expiryDate' | 'paymentStatus'> {
  paymentStatus?: string;
  expiryDate?: Date;
  totalPaid?: number;
  remainingAmount?: number;
  totalAmount?: number;
  effectivePaymentStatus?: 'paid' | 'partial' | 'unpaid';
  latestPaymentDate?: Date | null;
}

export default function ClientInvoicePage() {
  const { id } = useParams();
  const router = useRouter();

  const [client, setClient] = useState<ExtendedClient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${id}`, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          setClient(data);
        } else if (res.status === 401) {
          router.push('/login');
        } else {
          router.push('/login'); // Redirect to login on any error
        }
      } catch (err) {
        console.error(err);
        router.push('/login'); // Redirect to login on error
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchClient();
  }, [id, router]);

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString('en-PK');

  const formatPKR = (amount: number) =>
    new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(amount);

  if (loading || !client) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const total = client.price || 0;

  // ✅ Smart fallback logic
  const paid = client.totalPaid ?? 0;
  const remaining = client.remainingAmount ?? total - paid;

  // ✅ Status color - use effectivePaymentStatus if available, otherwise fall back to paymentStatus
  const effectiveStatus = client.effectivePaymentStatus || client.paymentStatus;
  const statusColor =
    effectiveStatus === 'paid'
      ? 'text-green-600 bg-green-100'
      : effectiveStatus === 'partial'
      ? 'text-yellow-600 bg-yellow-100'
      : 'text-red-600 bg-red-100';

  // ✅ WhatsApp Message
  const sendWhatsApp = () => {
    const phone = client.phone.replace(/\D/g, '');

    const message = `
📄 *Internet Invoice*

👤 ${client.name}
📦 ${client.package?.name} (${client.package?.speed} Mbps)

💰 Total: ${formatPKR(total)}
✅ Paid: ${formatPKR(paid)}
❌ Remaining: ${formatPKR(remaining)}

📅 Expiry: ${formatDate(client.expiryDate || new Date())}
📊 Status: ${client.effectivePaymentStatus || client.paymentStatus || 'UNPAID'}

Please clear your dues. Thank you!
`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 gap-4">

      {/* WhatsApp Button */}
      <button
        onClick={sendWhatsApp}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm shadow"
      >
        📲 Send via WhatsApp
      </button>

      {/* Ticket UI */}
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-lg border relative overflow-hidden">

        {/* Top Cut */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-[radial-gradient(circle,white_6px,transparent_7px)] bg-size-[20px_20px]" />

        {/* Header */}
        <div className="text-center pt-10 pb-4 px-6">
          <h1 className="text-xl font-semibold text-indigo-600">Package Invoice</h1>
          <p className="text-sm text-slate-600 mt-1">
            INV #{client.id.slice(0, 6).toUpperCase()}
          </p>

          <div className="mt-3 inline-block px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md border border-green-300">
            {formatDate(new Date())}
          </div>
        </div>

        {/* User + Logo */}
        <div className="flex justify-between items-center px-6 mt-4">
          <div>
            <h2 className="text-lg font-semibold">{client.name}</h2>
            <p className="text-sm text-indigo-500">{client.phone}</p>
            <p className="text-xs text-slate-500">
              {client.area}, {client.city}
            </p>
          </div>

          <Image src="/logo.png" alt="Logo" width={60} height={60} />
        </div>

        {/* Divider */}
        <div className="px-6 mt-4">
          <div className="h-2 bg-slate-100 rounded-md" />
        </div>

        {/* Package */}
        <div className="px-6 mt-4">
          <p className="bg-blue-100 text-xs px-3 py-1 rounded">Package Detail</p>

          <div className="flex justify-between text-sm mt-2">
            <span>Internet Package</span>
            <span>{client.package?.name}</span>
          </div>
        </div>

        {/* PAYMENT */}
        <div className="px-6 mt-4 space-y-1">
          <p className="bg-blue-100 text-xs px-3 py-1 rounded">Payment Detail</p>

          <div className="flex justify-between text-sm">
            <span>Total</span>
            <span>{formatPKR(total)}</span>
          </div>

          <div className="flex justify-between text-sm text-green-600">
            <span>Paid</span>
            <span>{formatPKR(paid)}</span>
          </div>

          <div className="flex justify-between text-sm text-red-600">
            <span>Remaining</span>
            <span>{formatPKR(remaining)}</span>
          </div>

          {client.latestPaymentDate && (
            <div className="flex justify-between text-sm text-blue-600">
              <span>Last Payment</span>
              <span>{formatDate(client.latestPaymentDate)}</span>
            </div>
          )}
        </div>

        {/* STATUS */}
        <div className="px-6 mt-4 flex justify-between text-sm">
          <div>
            <p className="text-xs text-slate-500">Status</p>
            <span className={`px-2 py-1 rounded text-xs ${statusColor}`}>
              {client.effectivePaymentStatus || client.paymentStatus || 'UNPAID'}
            </span>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-500">Expiry</p>
            <p>{formatDate(client.expiryDate || new Date())}</p>
          </div>
        </div>

        {/* TOTAL PAID BOX */}
        <div className="px-6 mt-6 mb-10">
          <div className="bg-blue-100 rounded-xl px-4 py-3 flex justify-between items-center">
            <span>Total Paid</span>
            <span className="text-xl font-bold text-indigo-700">
              {formatPKR(paid)}
            </span>
          </div>
        </div>

        {/* Bottom Cut */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-[radial-gradient(circle,white_6px,transparent_7px)] bg-size-[20px_20px]" />

      </div>

      {/* Print */}
      <style jsx global>{`
        @media print {
          button {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}





// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import { Client, Package, ServiceProvider } from '@prisma/client';
// import Image from 'next/image';

// interface ClientWithPackage extends Client {
//   package: Package & { serviceProvider?: ServiceProvider | null };
// }

// interface ExtendedClient extends Omit<ClientWithPackage, 'expiryDate' | 'paymentStatus'> {
//   paymentStatus?: string;
//   expiryDate?: Date;
// }

// export default function ClientInvoicePage() {
//   const { id } = useParams();
//   const router = useRouter();

//   const [client, setClient] = useState<ExtendedClient | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchClient = async () => {
//       try {
//         const res = await fetch(`/api/clients/${id}`, {
//           credentials: 'include',
//           cache: 'no-store',
//         });

//         if (res.ok) {
//           const data = await res.json();
//           setClient(data);
//         } else if (res.status === 401) {
//           router.push('/login');
//         }
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (id) fetchClient();
//   }, [id, router]);

//   const formatDate = (date: Date | string) =>
//     new Date(date).toLocaleDateString('en-PK');

//   const formatPKR = (amount: number) =>
//     new Intl.NumberFormat('en-PK', {
//       style: 'currency',
//       currency: 'PKR',
//       maximumFractionDigits: 0,
//     }).format(amount);

//   if (loading || !client) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         Loading...
//       </div>
//     );
//   }

//   const internetCharges = client.price || 0;
//   const discount = 0;
//   const total = internetCharges - discount;

//   // ✅ Payment Status UI Color
//   const statusColor =
//     client.paymentStatus === 'PAID'
//       ? 'text-green-600 bg-green-100'
//       : client.paymentStatus === 'PARTIAL'
//       ? 'text-yellow-600 bg-yellow-100'
//       : 'text-red-600 bg-red-100';

//   // ✅ WhatsApp Function
//   const sendWhatsApp = () => {
//     const phone = client.phone.replace(/\D/g, ''); // clean number

//     const message = `
// 📄 *Internet Invoice*

// 👤 Name: ${client.name}
// 📦 Package: ${client.package?.name} (${client.package?.speed} Mbps)
// 💰 Amount: ${formatPKR(total)}
// 📅 Expiry: ${formatDate(client.expiryDate || new Date())}
// 📊 Status: ${client.paymentStatus || 'UNPAID'}

// Please pay your bill. Thank you!
// `;

//     const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
//     window.open(url, '_blank');
//   };

//   return (
//     <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 gap-4">

//       {/* WhatsApp Button */}
//       <button
//         onClick={sendWhatsApp}
//         className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm shadow"
//       >
//         📲 Send via WhatsApp
//       </button>

//       {/* Ticket Container */}
//       <div className="w-full max-w-md bg-white rounded-[30px] shadow-lg border relative overflow-hidden">

//         {/* Top Ticket Cut */}
//         <div className="absolute top-0 left-0 right-0 h-6 bg-[radial-gradient(circle,white_6px,transparent_7px)] bg-size-[20px_20px]" />

//         {/* Header */}
//         <div className="text-center pt-10 pb-4 px-6">
//           <h1 className="text-xl font-semibold text-indigo-600">
//             Package Invoice
//           </h1>

//           <p className="text-sm text-slate-600 mt-1">
//             INV #{client.id.slice(0, 6).toUpperCase()}
//           </p>

//           <div className="mt-3 inline-block px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md border border-green-300">
//             {formatDate(new Date())}
//           </div>
//         </div>

//         {/* User + Logo */}
//         <div className="flex justify-between items-center px-6 mt-4">
//           <div>
//             <h2 className="text-lg font-semibold text-slate-800">
//               {client.name}
//             </h2>
//             <p className="text-sm text-indigo-500">{client.phone}</p>
//             <p className="text-xs text-slate-500 mt-1">
//               {client.area}, {client.city}
//             </p>
//           </div>

//           <Image
//             src="/logo.png"
//             alt="Company Logo"
//             width={60}
//             height={60}
//           />
//         </div>

//         {/* Divider */}
//         <div className="px-6 mt-4">
//           <div className="h-2 bg-slate-100 rounded-md" />
//         </div>

//         {/* USER DETAIL */}
//         <div className="px-6 mt-4">
//           <p className="bg-blue-100 text-xs px-3 py-1 rounded">
//             User Detail
//           </p>

//           <div className="flex justify-between text-sm mt-2">
//             <span>Username</span>
//             <span>{client.name}</span>
//           </div>
//         </div>

//         {/* PACKAGE DETAIL */}
//         <div className="px-6 mt-4">
//           <p className="bg-blue-100 text-xs px-3 py-1 rounded">
//             Package Detail
//           </p>

//           <div className="flex justify-between text-sm mt-2">
//             <span>Internet Package</span>
//             <span>
//               {client.package?.name} ({client.package?.speed} Mbps)
//             </span>
//           </div>
//         </div>

//         {/* PAYMENT DETAIL */}
//         <div className="px-6 mt-4 space-y-1">
//           <p className="bg-blue-100 text-xs px-3 py-1 rounded">
//             Payment Detail
//           </p>

//           <div className="flex justify-between text-sm">
//             <span>Internet Charges</span>
//             <span>{formatPKR(internetCharges)}</span>
//           </div>
//         </div>

//         {/* STATUS + EXPIRY */}
//         <div className="px-6 mt-4 flex justify-between items-center text-sm">
//           <div>
//             <p className="text-slate-500 text-xs">Status</p>
//             <span className={`px-2 py-1 rounded text-xs ${statusColor}`}>
//               {client.paymentStatus || 'UNPAID'}
//             </span>
//           </div>

//           <div className="text-right">
//             <p className="text-slate-500 text-xs">Next Expiry</p>
//             <p>{formatDate(client.expiryDate || new Date())}</p>
//           </div>
//         </div>

//         {/* TOTAL */}
//         <div className="px-6 mt-6 mb-10">
//           <div className="bg-blue-100 rounded-xl px-4 py-3 flex justify-between items-center">
//             <span>Total Amount</span>
//             <span className="text-xl font-bold text-indigo-700">
//               {formatPKR(total)}
//             </span>
//           </div>
//         </div>

//         {/* Bottom Cut */}
//         <div className="absolute bottom-0 left-0 right-0 h-6 bg-[radial-gradient(circle,white_6px,transparent_7px)] bg-size-[20px_20px]" />

//       </div>

//       {/* PRINT */}
//       <style jsx global>{`
//         @media print {
//           button {
//             display: none;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }





// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import { Client, Package, ServiceProvider } from '@prisma/client';
// import Image from 'next/image';

// interface ClientWithPackage extends Client {
//   package: Package & { serviceProvider?: ServiceProvider | null };
// }

// interface ExtendedClient extends ClientWithPackage {}

// export default function ClientInvoicePage() {
//   const { id } = useParams();
//   const router = useRouter();

//   const [client, setClient] = useState<ExtendedClient | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchClient = async () => {
//       try {
//         const res = await fetch(`/api/clients/${id}`, {
//           credentials: 'include',
//           cache: 'no-store',
//         });

//         if (res.ok) {
//           const data = await res.json();
//           setClient(data);
//         } else if (res.status === 401) {
//           router.push('/login');
//         }
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (id) fetchClient();
//   }, [id, router]);

//   const formatDate = (date: Date | string) =>
//     new Date(date).toLocaleString('en-PK');

//   const formatPKR = (amount: number) =>
//     new Intl.NumberFormat('en-PK', {
//       style: 'currency',
//       currency: 'PKR',
//       maximumFractionDigits: 0,
//     }).format(amount);

//   if (loading || !client) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         Loading...
//       </div>
//     );
//   }

//   // 🔹 Charges (you can later make dynamic)
//   const internetCharges = client.price || 0;
//   const discount = 0;
//   const total = internetCharges - discount;

//   return (
//     <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">

//       {/* Ticket Container */}
//       <div className="w-full max-w-md bg-white rounded-[30px] shadow-lg border relative overflow-hidden">

//         {/* Top Ticket Cut Design */}
//         <div className="absolute top-0 left-0 right-0 h-6 bg-[radial-gradient(circle,white_6px,transparent_7px)] bg-size-[20px_20px]" />

//         {/* Header */}
//         <div className="text-center pt-10 pb-4 px-6">
//           <h1 className="text-xl font-semibold text-indigo-600">
//             Package Invoice
//           </h1>

//           <p className="text-sm text-slate-600 mt-1">
//             INV #{client.id.slice(0, 6).toUpperCase()}
//           </p>

//           <div className="mt-3 inline-block px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md border border-green-300">
//             {formatDate(new Date())}
//           </div>
//         </div>

//         {/* User + Logo */}
//         <div className="flex justify-between items-center px-6 mt-4">
//           <div>
//             <h2 className="text-lg font-semibold text-slate-800">
//               {client.name}
//             </h2>
//             <p className="text-sm text-indigo-500">{client.phone}</p>
//             <p className="text-xs text-slate-500 mt-1">
//               {client.area}, {client.city}
//             </p>
//           </div>

//           <Image
//             src="/logo.png"
//             alt="Company Logo"
//             width={60}
//             height={60}
//             className="object-contain"
//           />
//         </div>

//         {/* Divider */}
//         <div className="px-6 mt-4">
//           <div className="h-2 bg-slate-100 rounded-md" />
//         </div>

//         {/* USER DETAIL */}
//         <div className="px-6 mt-4">
//           <p className="bg-blue-100 text-slate-600 text-xs px-3 py-1 rounded">
//             User Detail
//           </p>

//           <div className="flex justify-between text-sm mt-2">
//             <span className="text-indigo-600">Username</span>
//             <span>{client.name}</span>
//           </div>
//         </div>

//         {/* PACKAGE DETAIL */}
//         <div className="px-6 mt-4">
//           <p className="bg-blue-100 text-slate-600 text-xs px-3 py-1 rounded">
//             Package Detail
//           </p>

//           <div className="flex justify-between text-sm mt-2">
//             <span className="text-indigo-600">Internet Package</span>
//             <span>
//               {client.package?.name} ({client.package?.speed} Mbps)
//             </span>
//           </div>
//         </div>

//         {/* PAYMENT DETAIL */}
//         <div className="px-6 mt-4 space-y-1">
//           <p className="bg-blue-100 text-slate-600 text-xs px-3 py-1 rounded">
//             Payment Detail
//           </p>

//           <div className="flex justify-between text-sm">
//             <span className="text-indigo-600">Internet Charges</span>
//             <span>{formatPKR(internetCharges)}</span>
//           </div>
//         </div>

//         {/* TOTAL */}
//         <div className="px-6 mt-6 mb-10">
//           <div className="bg-blue-100 rounded-xl px-4 py-3 flex justify-between items-center">
//             <span className="text-slate-600 text-sm">Total Amount</span>
//             <span className="text-xl font-bold text-indigo-700">
//               {formatPKR(total)}
//             </span>
//           </div>
//         </div>

//         {/* Bottom Ticket Cut */}
//         <div className="absolute bottom-0 left-0 right-0 h-6 bg-[radial-gradient(circle,white_6px,transparent_7px)] bg-size-[20px_20px]" />

//       </div>

//       {/* PRINT STYLES */}
//       <style jsx global>{`
//         @media print {
//           body {
//             background: white;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }



// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import { Client, Package, ServiceProvider } from '@prisma/client';
// import {
//   User, Phone, MapPin, Calendar, CreditCard, IndianRupee,
//   Building, Factory, Wifi, Clock, Mail, Hash, Download, ArrowLeft
// } from 'lucide-react';
// import Link from 'next/link';

// interface ClientWithPackage extends Client {
//   package: Package & { serviceProvider?: ServiceProvider | null };
// }

// interface ExtendedClient extends ClientWithPackage {
//   email: any;
//   _count?: { payments: number };
//   totalPaid?: number;
//   remainingAmount?: number;
//   effectivePaymentStatus?: string;
// }

// export default function ClientInvoicePage() {
//   const { id } = useParams();
//   const router = useRouter();
//   const [client, setClient] = useState<ExtendedClient | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchClient = async () => {
//       try {
//         const res = await fetch(`/api/clients/${id}`, {
//           credentials: 'include',
//           cache: 'no-store'
//         });

//         if (res.ok) {
//           const data: ExtendedClient = await res.json();
//           setClient(data);
//         } else if (res.status === 401) {
//           router.push('/login');
//         } else {
//           setError('Failed to fetch client data');
//         }
//       } catch (err) {
//         console.error('Error fetching client:', err);
//         setError('An error occurred while fetching client data');
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (id) {
//       fetchClient();
//     }
//   }, [id, router]);

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-slate-50/30 dark:bg-slate-900/20 py-8">
//         <div className="max-w-4xl mx-auto px-4">
//           <div className="animate-pulse space-y-6">
//             <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
//             <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6">
//               <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
//               <div className="space-y-3">
//                 <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
//                 <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4"></div>
//                 <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (error || !client) {
//     return (
//       <div className="min-h-screen bg-slate-50/30 dark:bg-slate-900/20 py-8">
//         <div className="max-w-4xl mx-auto px-4">
//           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6">
//             <h1 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Error Loading Client</h1>
//             <p className="text-slate-600 dark:text-slate-300">{error || 'Client not found'}</p>
//             <Link href="/dashboard/clients" className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
//               <ArrowLeft className="w-4 h-4" />
//               Back to Clients
//             </Link>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   const formatDate = (date: Date | string) => {
//     return new Date(date).toLocaleDateString('en-PK', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric'
//     });
//   };

//   const formatPKR = (amount: number) => {
//     return new Intl.NumberFormat('en-PK', {
//       style: 'currency',
//       currency: 'PKR',
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0
//     }).format(amount);
//   };

//   // Generate invoice data
//   const invoiceDate = new Date();
//   const dueDate = new Date();
//   dueDate.setDate(dueDate.getDate() + 30); // 30 days from now
//   const invoiceNumber = `INV-${client.id.substring(0, 8).toUpperCase()}-${Date.now()}`;

//   return (
//     <div className="min-h-screen bg-slate-50/30 dark:bg-slate-900/20 py-8">
//       <div className="max-w-4xl mx-auto px-4">
//         {/* Header */}
//         <div className="mb-8">
//           <div className="flex items-center justify-between">
//             <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Invoice</h1>
//             <button
//               onClick={() => window.print()}
//               className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
//             >
//               <Download className="w-4 h-4" />
//               Print Invoice
//             </button>
//           </div>
//           <p className="text-slate-500 dark:text-slate-400 mt-1">Detailed invoice for client services</p>
//         </div>

//         {/* Invoice Card */}
//         <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 overflow-hidden">
//           {/* Invoice Header */}
//           <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
//             <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//               <div>
//                 <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Internet Service Provider</h2>
//                 <p className="text-slate-600 dark:text-slate-300 text-sm">Monthly Service Invoice</p>
//               </div>
//               <div className="text-right">
//                 <p className="text-slate-800 dark:text-white font-medium">Invoice #{invoiceNumber}</p>
//                 <p className="text-slate-600 dark:text-slate-300 text-sm">Date: {formatDate(invoiceDate)}</p>
//                 <p className="text-slate-600 dark:text-slate-300 text-sm">Due: {formatDate(dueDate)}</p>
//               </div>
//             </div>
//           </div>

//           {/* Billing Information */}
//           <div className="p-6">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
//               {/* Bill From */}
//               <div>
//                 <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Bill From</h3>
//                 <div className="space-y-1 text-sm">
//                   <p className="font-medium text-slate-800 dark:text-white">Internet Service Provider</p>
//                   <p className="text-slate-600 dark:text-slate-300">123 Network Street</p>
//                   <p className="text-slate-600 dark:text-slate-300">Karachi, Pakistan</p>
//                   <p className="text-slate-600 dark:text-slate-300">contact@isp.com</p>
//                   <p className="text-slate-600 dark:text-slate-300">+92 300 1234567</p>
//                 </div>
//               </div>

//               {/* Bill To */}
//               <div>
//                 <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Bill To</h3>
//                 <div className="space-y-1 text-sm">
//                   <p className="font-medium text-slate-800 dark:text-white">{client.name}</p>
//                   <p className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
//                     <Hash className="w-3 h-3" />
//                     {client.cnic}
//                   </p>
//                   <p className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
//                     <Phone className="w-3 h-3" />
//                     {client.phone}
//                   </p>
//                   {client.email && (
//                     <p className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
//                       <Mail className="w-3 h-3" />
//                       {client.email}
//                     </p>
//                   )}
//                   <p className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
//                     <MapPin className="w-3 h-3" />
//                     {client.area}, {client.city}
//                   </p>
//                 </div>
//               </div>
//             </div>

//             {/* Service Details */}
//             <div className="mb-8">
//               <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Service Details</h3>
//               <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
//                 <table className="w-full">
//                   <thead className="bg-slate-50/80 dark:bg-slate-900/50">
//                     <tr>
//                       <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-300 font-medium text-sm">Description</th>
//                       <th className="text-right py-3 px-4 text-slate-600 dark:text-slate-300 font-medium text-sm">Amount</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     <tr className="border-t border-slate-100 dark:border-slate-700">
//                       <td className="py-3 px-4">
//                         <div className="font-medium text-slate-800 dark:text-white">{client.package?.name || 'Internet Package'}</div>
//                         <div className="text-sm text-slate-600 dark:text-slate-300">
//                           {client.package?.speed} Mbps • {client.package?.serviceProvider?.name || 'Service Provider'}
//                         </div>
//                       </td>
//                       <td className="py-3 px-4 text-right text-slate-800 dark:text-white">
//                         {formatPKR(client.price || 0)}
//                       </td>
//                     </tr>
//                     <tr className="border-t border-slate-100 dark:border-slate-700">
//                       <td className="py-3 px-4">
//                         <div className="font-medium text-slate-800 dark:text-white">Additional Charges</div>
//                         <div className="text-sm text-slate-600 dark:text-slate-300">Late fees, taxes, etc.</div>
//                       </td>
//                       <td className="py-3 px-4 text-right text-slate-800 dark:text-white">
//                         {formatPKR(0)}
//                       </td>
//                     </tr>
//                   </tbody>
//                   <tfoot className="bg-slate-50/80 dark:bg-slate-900/50 font-semibold">
//                     <tr>
//                       <td className="py-3 px-4 text-slate-800 dark:text-white">Total</td>
//                       <td className="py-3 px-4 text-right text-slate-800 dark:text-white">
//                         {formatPKR(client.price || 0)}
//                       </td>
//                     </tr>
//                   </tfoot>
//                 </table>
//               </div>
//             </div>

//             {/* Additional Information */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//               <div>
//                 <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Package Info</h4>
//                 <div className="space-y-1 text-sm">
//                   <p className="text-slate-800 dark:text-white">{client.package?.name || 'N/A'}</p>
//                   <p className="text-slate-600 dark:text-slate-300">{client.package?.speed} Mbps</p>
//                 </div>
//               </div>
//               <div>
//                 <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Expiry Date</h4>
//                 <div className="space-y-1 text-sm">
//                   <p className="text-slate-800 dark:text-white">{formatDate(client.expiryDate)}</p>
//                   <p className="text-slate-600 dark:text-slate-300">Renewal required</p>
//                 </div>
//               </div>
//               <div>
//                 <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Status</h4>
//                 <div className="space-y-1 text-sm">
//                   <p className="text-slate-800 dark:text-white">{client.status}</p>
//                   <p className="text-slate-600 dark:text-slate-300">{client.paymentStatus}</p>
//                 </div>
//               </div>
//             </div>

//             {/* Payment Instructions */}
//             <div className="bg-slate-50/50 dark:bg-slate-900/20 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
//               <h4 className="font-medium text-slate-800 dark:text-white mb-2">Payment Instructions</h4>
//               <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
//                 <li>• Payment is due within 30 days of invoice date</li>
//                 <li>• Pay online through our portal or visit our office</li>
//                 <li>• Late payments may incur additional charges</li>
//                 <li>• Contact us if you have any questions about this invoice</li>
//               </ul>
//             </div>
//           </div>

//           {/* Invoice Footer */}
//           <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20">
//             <p className="text-center text-slate-500 dark:text-slate-400 text-sm">
//               Thank you for your business! If you have any questions about this invoice, please contact us.
//             </p>
//           </div>
//         </div>

//         {/* Back Button */}
//         <div className="mt-6">
//           <Link
//             href={`/dashboard/clients/${client.id}`}
//             className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors font-medium"
//           >
//             <ArrowLeft className="w-4 h-4" />
//             Back to Client Details
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// }