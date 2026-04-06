"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Client, Package, ServiceProvider } from "@prisma/client";
import Image from "next/image";
import PaymentModal from "@/components/payments/PaymentModal";

interface ClientWithPackage extends Client {
  package: Package & { serviceProvider?: ServiceProvider | null };
}

interface ExtendedClient extends Omit<
  ClientWithPackage,
  "expiryDate" | "paymentStatus"
> {
  paymentStatus?: string;
  expiryDate?: Date;
  totalPaid?: number;
  remainingAmount?: number;
  totalAmount?: number;
  effectivePaymentStatus?: "paid" | "partial" | "unpaid";
  latestPaymentDate?: Date | null;
}

export default function ClientInvoicePage() {
  const { id } = useParams();
  const router = useRouter();

  const [client, setClient] = useState<ExtendedClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [additionalCharges, setAdditionalCharges] = useState<
    Array<{ name: string; amount: number }>
  >([]);
  const [showAddCharges, setShowAddCharges] = useState(false);
  const [newCharge, setNewCharge] = useState({ name: "", amount: "" });

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${id}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          setClient(data);

          if (
            data.invoices &&
            data.invoices.length > 0 &&
            data.invoices[0].additionalCharges
          ) {
            try {
              const charges =
                typeof data.invoices[0].additionalCharges === "string"
                  ? JSON.parse(data.invoices[0].additionalCharges)
                  : data.invoices[0].additionalCharges;
              if (Array.isArray(charges)) {
                setAdditionalCharges(charges);
              }
            } catch (error) {
              console.error("Error loading additional charges:", error);
            }
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error(err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchClient();
  }, [id, router]);

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatPKR = (amount: number) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount);

  if (loading || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const packagePrice = client.price || 0;
  const additionalTotal = additionalCharges.reduce(
    (sum, c) => sum + c.amount,
    0,
  );
  const total = packagePrice + additionalTotal;
  const paid = client.totalPaid ?? 0;
  const remaining = total - paid;

  const handleAddCharge = async () => {
    if (newCharge.name && newCharge.amount) {
      const charge = {
        name: newCharge.name,
        amount: parseFloat(newCharge.amount),
      };
      const updatedCharges = [...additionalCharges, charge];
      setAdditionalCharges(updatedCharges);
      setNewCharge({ name: "", amount: "" });

      try {
        const invoicesResponse = await fetch(
          `/api/invoices?clientId=${client.id}`,
          { credentials: "include" },
        );

        let invoiceId: string | null = null;

        if (invoicesResponse.ok) {
          const invoices = await invoicesResponse.json();
          if (invoices.length > 0) {
            invoiceId = invoices[0].id;
          }
        }

        if (!invoiceId) {
          await fetch("/api/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              clientId: client.id,
              amount: client.price,
              dueDate: new Date().toISOString().split("T")[0],
              description: `Invoice for ${client.name}`,
              additionalCharges: updatedCharges,
            }),
          });
        } else {
          await fetch(`/api/invoices/${invoiceId}/additional-charges`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              invoiceId,
              additionalCharges: updatedCharges,
            }),
          });
        }
      } catch (error) {
        console.error("Error saving additional charges:", error);
      }
    }
  };

  const handleRemoveCharge = (index: number) => {
    setAdditionalCharges(additionalCharges.filter((_, i) => i !== index));
  };

  let effectiveStatus: string;
  let statusColor: string;

  if (remaining < -0.01) {
    effectiveStatus = "OVERPAID";
    statusColor = "text-blue-600 bg-blue-100";
  } else if (remaining <= 0.01) {
    effectiveStatus = "PAID";
    statusColor = "text-green-600 bg-green-100";
  } else if (paid > 0) {
    effectiveStatus = "PARTIAL";
    statusColor = "text-yellow-600 bg-yellow-100";
  } else {
    effectiveStatus = "UNPAID";
    statusColor = "text-red-600 bg-red-100";
  }

  const sendWhatsApp = () => {
    const phone = client.phone.replace(/\D/g, "");
    const message = `
📄 *Package Invoice*
INV #${client.id.slice(0, 6).toUpperCase()}
Date: ${formatDate(new Date())}

👤 *Client Details*
Name: ${client.name}
Phone: ${client.phone}
Address: ${client.area}, ${client.city}

📦 *Package Detail*
Package: ${client.package?.name}
Duration: 1 Month

💰 *Payment Detail*
Package Charges: ${formatPKR(packagePrice)}
One-Time Charges: ${formatPKR(additionalTotal)}
Subtotal: ${formatPKR(total)}
Discount: ${formatPKR(0)}
Grand Total: ${formatPKR(total)}

💳 *Payment Status*
Paid Amount: ${formatPKR(paid)}
Remaining Amount: ${formatPKR(remaining)}

Last Payment: ${client.latestPaymentDate ? formatDate(client.latestPaymentDate) : "N/A"}
Expiry Date: ${formatDate(client.expiryDate || new Date())}
Status: ${effectiveStatus === "PAID" ? "✅ PAID" : effectiveStatus === "PARTIAL" ? "⏳ PARTIAL" : "❌ UNPAID"}

Please clear your dues. Thank you!
`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 to-blue-50 flex flex-col items-center justify-center p-4 gap-3">
      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        <button
          onClick={sendWhatsApp}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm shadow transition-colors"
        >
          📲 Send via WhatsApp
        </button>
        {remaining > 0.01 && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm shadow transition-colors"
          >
            💳 Pay Now
          </button>
        )}
      </div>

      {/* Invoice Container */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 relative overflow-hidden">
        {/* Decorative Top Edge */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-linear-to-r from-indigo-500 via-purple-500 to-blue-500" />

        {/* Header */}
        <div className="text-center pt-6 pb-4 px-6">
          <h1 className="text-2xl font-bold text-indigo-700">
            Package Invoice
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            INV #{client.id.slice(0, 6).toUpperCase()}
          </p>
          <div className="mt-2 inline-flex items-center px-3 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full border border-green-200">
            {formatDate(new Date())}
          </div>
        </div>

        {/* User Info & Logo */}
        <div className="px-6 pb-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">
                {client.name}
              </h2>
              <p className="text-sm text-indigo-600 font-medium">
                {client.phone}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {client.area}, {client.city}
              </p>
            </div>
            <div className="ml-4">
              <Image
                src="/logo.png"
                alt="Transworld"
                width={60}
                height={60}
                className="object-contain"
              />
              {/* <p className="text-xs text-center text-slate-600 mt-1 font-medium">SNS</p> */}
            </div>
          </div>
        </div>

        {/* User Detail Section */}
        <div className="px-6 py-2 bg-blue-50 border-y border-blue-100">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            User Detail
          </p>
        </div>
        <div className="px-6 py-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Username</span>
            <span className="text-slate-800 font-medium">{client.name}</span>
          </div>
        </div>

        {/* Package Detail Section */}
        <div className="px-6 py-2 bg-blue-50 border-y border-blue-100 mt-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Package Detail
          </p>
        </div>
        <div className="px-6 py-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Internet Package</span>
            <span className="text-slate-800 font-medium">
              {client.package?.name}
            </span>
          </div>
        </div>

        {/* One-Time Charges Section - Only for adding/editing */}
        <div className="px-6 py-2 mt-0.5">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-200">
              🔧 One-Time Charges
            </p>
            <button
              onClick={() => setShowAddCharges(!showAddCharges)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              {showAddCharges ? "Cancel" : "+ Add Charge"}
            </button>
          </div>

          {showAddCharges && (
            <div className="bg-slate-50 rounded-lg p-2 mb-2 space-y-2 border border-slate-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Item name"
                  value={newCharge.name}
                  onChange={(e) =>
                    setNewCharge({ ...newCharge, name: e.target.value })
                  }
                  className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={newCharge.amount}
                  onChange={(e) =>
                    setNewCharge({ ...newCharge, amount: e.target.value })
                  }
                  className="w-24 px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddCharge}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Show count of charges if any exist */}
          {additionalCharges.length > 0 && (
            <div className="text-xs text-slate-500 italic">
              {additionalCharges.length} charge
              {additionalCharges.length > 1 ? "s" : ""} added
            </div>
          )}
        </div>

        {/* Payment Detail Section - Show ALL charges here */}
        <div className="px-6 py-2 bg-blue-50 border-y border-blue-100 mt-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Payment Detail
          </p>
        </div>
        <div className="px-6 py-3 space-y-2">
          {/* Internet/Package Charges */}
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">Internet Charges</span>
            <span className="text-slate-800 text-xs leading-tight">
              {formatPKR(packagePrice)}
            </span>
          </div>

          {/* One-Time Charges listed individually */}
          {additionalCharges.map((charge, idx) => (
            <div key={idx} className="flex justify-between items-center py-0.5">
              <span className="text-slate-600 text-xs leading-tight">
                {charge.name}
              </span>
              <span className="text-slate-800 font-normal text-xs leading-tight">
                {formatPKR(charge.amount)}
              </span>
            </div>
          ))}

          {/* Subtotal */}
          {additionalCharges.length > 0 && (
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
              <span className="text-slate-600">Subtotal</span>
              <span className="text-slate-800 font-medium">
                {formatPKR(total)}
              </span>
            </div>
          )}

          {/* Discount */}
          {/* <div className="flex justify-between text-sm">
            <span className="text-slate-600">Discount</span>
            <span className="text-red-600 font-medium">-{formatPKR(0)}</span>
          </div> */}
        </div>

        {/* Total Amount Box */}
        <div className="mx-6 mb-4 mt-1 bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-700">
              Total Amount
            </span>
            <span className="text-2xl font-bold text-indigo-700">
              {formatPKR(total)}
            </span>
          </div>
        </div>

        {/* Payment Status Section */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Paid Amount</span>
            <span className="text-green-600 font-semibold">
              {formatPKR(paid)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Remaining Amount</span>
            <span
              className={`font-semibold ${remaining > 0 ? "text-red-600" : "text-green-600"}`}
            >
              {formatPKR(remaining)}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
            <span className="text-slate-600">Status</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}
            >
              {effectiveStatus}
            </span>
          </div>
        </div>

        {/* Decorative Bottom Edge */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-linear-to-r from-indigo-500 via-purple-500 to-blue-500" />
      </div>

      {/* Payment Modal */}
      {client && remaining > 0 && showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={remaining}
          title={`Invoice #${client.id.slice(0, 6).toUpperCase()}`}
          description={`Payment for ${client.name}`}
          metadata={{
            referenceType: "invoice",
            referenceId: client.id,
            clientId: client.id,
            invoiceId: client.id,
          }}
          additionalCharges={
            additionalCharges.length > 0 ? additionalCharges : undefined
          }
        />
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          button {
            display: none !important;
          }
          body {
            background: white;
          }
        }
      `}</style>
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { Client, Package, ServiceProvider } from "@prisma/client";
// import Image from "next/image";
// import PaymentModal from "@/components/payments/PaymentModal";

// interface ClientWithPackage extends Client {
//   package: Package & { serviceProvider?: ServiceProvider | null };
// }

// interface ExtendedClient extends Omit<
//   ClientWithPackage,
//   "expiryDate" | "paymentStatus"
// > {
//   paymentStatus?: string;
//   expiryDate?: Date;
//   totalPaid?: number;
//   remainingAmount?: number;
//   totalAmount?: number;
//   effectivePaymentStatus?: "paid" | "partial" | "unpaid";
//   latestPaymentDate?: Date | null;
// }

// export default function ClientInvoicePage() {
//   const { id } = useParams();
//   const router = useRouter();

//   const [client, setClient] = useState<ExtendedClient | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [showPaymentModal, setShowPaymentModal] = useState(false);
//   const [additionalCharges, setAdditionalCharges] = useState<
//     Array<{ name: string; amount: number }>
//   >([]);
//   const [showAddCharges, setShowAddCharges] = useState(false);
//   const [newCharge, setNewCharge] = useState({ name: "", amount: "" });

//   useEffect(() => {
//     const fetchClient = async () => {
//       try {
//         const res = await fetch(`/api/clients/${id}`, {
//           credentials: "include",
//           cache: "no-store",
//         });

//         if (res.ok) {
//           const data = await res.json();
//           setClient(data);

//           // Load existing additional charges from the first invoice if available
//           if (
//             data.invoices &&
//             data.invoices.length > 0 &&
//             data.invoices[0].additionalCharges
//           ) {
//             try {
//               const charges =
//                 typeof data.invoices[0].additionalCharges === "string"
//                   ? JSON.parse(data.invoices[0].additionalCharges)
//                   : data.invoices[0].additionalCharges;
//               if (Array.isArray(charges)) {
//                 setAdditionalCharges(charges);
//               }
//             } catch (error) {
//               console.error("Error loading additional charges:", error);
//             }
//           }
//         } else if (res.status === 401) {
//           router.push("/login");
//         } else {
//           router.push("/login"); // Redirect to login on any error
//         }
//       } catch (err) {
//         console.error(err);
//         router.push("/login"); // Redirect to login on error
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (id) fetchClient();
//   }, [id, router]);

//   const formatDate = (date: Date | string) =>
//     new Date(date).toLocaleDateString("en-PK");

//   const formatPKR = (amount: number) =>
//     new Intl.NumberFormat("en-PK", {
//       style: "currency",
//       currency: "PKR",
//       maximumFractionDigits: 0,
//     }).format(amount);

//   if (loading || !client) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         Loading...
//       </div>
//     );
//   }

//   // ✅ Correct calculation logic
//   const packagePrice = client.price || 0;
//   const additionalTotal = additionalCharges.reduce(
//     (sum, c) => sum + c.amount,
//     0,
//   );
//   const total = packagePrice + additionalTotal;
//   const paid = client.totalPaid ?? 0;
//   const remaining = total - paid;

//   // Add charge to list
//   const handleAddCharge = async () => {
//     if (newCharge.name && newCharge.amount) {
//       const charge = {
//         name: newCharge.name,
//         amount: parseFloat(newCharge.amount),
//       };
//       const updatedCharges = [...additionalCharges, charge];
//       setAdditionalCharges(updatedCharges);
//       setNewCharge({ name: "", amount: "" });

//       // Save additional charges to the first invoice for this client
//       try {
//         // Find or create an invoice for this client
//         const invoicesResponse = await fetch(
//           `/api/invoices?clientId=${client.id}`,
//           {
//             credentials: "include",
//           },
//         );

//         let invoiceId: string | null = null;

//         if (invoicesResponse.ok) {
//           const invoices = await invoicesResponse.json();
//           if (invoices.length > 0) {
//             // Use the first invoice
//             invoiceId = invoices[0].id;
//           }
//         }

//         if (!invoiceId) {
//           // Create a new invoice
//           const createResponse = await fetch("/api/invoices", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             credentials: "include",
//             body: JSON.stringify({
//               clientId: client.id,
//               amount: client.price,
//               dueDate: new Date().toISOString().split("T")[0],
//               description: `Invoice for ${client.name}`,
//               additionalCharges: updatedCharges,
//             }),
//           });

//           if (createResponse.ok) {
//             const newInvoice = await createResponse.json();
//             console.log("Created invoice with additional charges:", newInvoice);
//           }
//         } else {
//           // Update existing invoice with additional charges
//           const updateResponse = await fetch(
//             `/api/invoices/${invoiceId}/additional-charges`,
//             {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               credentials: "include",
//               body: JSON.stringify({
//                 invoiceId,
//                 additionalCharges: updatedCharges,
//               }),
//             },
//           );

//           if (!updateResponse.ok) {
//             console.error("Failed to update invoice with additional charges");
//           }
//         }
//       } catch (error) {
//         console.error("Error saving additional charges:", error);
//       }
//     }
//   };

//   // Remove charge from list
//   const handleRemoveCharge = (index: number) => {
//     setAdditionalCharges(additionalCharges.filter((_, i) => i !== index));
//   };

//   // ✅ Calculate status directly from amounts based on requested logic
//   let effectiveStatus: string;
//   let statusColor: string;

//   if (remaining < -0.01) {
//     effectiveStatus = "OVERPAID";
//     statusColor = "text-blue-600 bg-blue-100";
//   } else if (remaining <= 0.01) {
//     effectiveStatus = "PAID";
//     statusColor = "text-green-600 bg-green-100";
//   } else if (paid > 0) {
//     effectiveStatus = "PARTIAL";
//     statusColor = "text-yellow-600 bg-yellow-100";
//   } else {
//     effectiveStatus = "UNPAID";
//     statusColor = "text-red-600 bg-red-100";
//   }

//   // ✅ WhatsApp Message
//   const sendWhatsApp = () => {
//     const phone = client.phone.replace(/\D/g, "");

//     const message = `
// 📄 *Package Invoice*
// INV #${client.id.slice(0, 6).toUpperCase()}
// Date: ${formatDate(new Date())}

// 👤 *Client Details*
// Name: ${client.name}
// Phone: ${client.phone}
// Address: ${client.area}, ${client.city}

// 📦 *Package Detail*
// Package: ${client.package?.name}
// Duration: 1 Month

// 💰 *Payment Detail*
// Package Charges: ${formatPKR(packagePrice)}
// One-Time Charges: ${formatPKR(additionalTotal)}
// Subtotal: ${formatPKR(total)}
// Discount: ${formatPKR(0)}
// Grand Total: ${formatPKR(total)}

// 💳 *Payment Status*
// Paid Amount: ${formatPKR(paid)}
// Remaining Amount: ${formatPKR(remaining)}

// Last Payment: ${client.latestPaymentDate ? formatDate(client.latestPaymentDate) : "N/A"}
// Expiry Date: ${formatDate(client.expiryDate || new Date())}
// Status: ${effectiveStatus === "PAID" ? "✅ PAID" : effectiveStatus === "PARTIAL" ? "⏳ PARTIAL" : "❌ UNPAID"}

// Please clear your dues. Thank you!
// `;

//     window.open(
//       `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
//       "_blank",
//     );
//   };

//   return (
//     <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 gap-3">
//       {/* Action Buttons */}
//       <div className="flex gap-2">
//         <button
//           onClick={sendWhatsApp}
//           className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm shadow"
//         >
//           📲 Send via WhatsApp
//         </button>
//         {additionalCharges.length > 0 && (
//           <button
//             onClick={() =>
//               alert("One-time charges will be saved when you make a payment")
//             }
//             className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm shadow"
//           >
//             💾 Save One-Time Charges
//           </button>
//         )}
//         {remaining > 0.01 && (
//           <button
//             onClick={() => setShowPaymentModal(true)}
//             className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm shadow flex items-center gap-2"
//           >
//             💳 Pay Now
//           </button>
//         )}
//       </div>

//       {/* Ticket UI */}
//       <div className="w-full max-w-sm bg-white rounded-[30px] shadow-lg border relative overflow-hidden">
//         {/* Top Cut */}
//         <div className="absolute top-0 left-0 right-0 h-6 bg-[radial-gradient(circle,white_6px,transparent_7px)] bg-size-[20px_20px]" />

//         {/* Header */}
//         <div className="text-center pt-8 pb-3 px-5">
//           <h1 className="text-lg font-semibold text-indigo-600">
//             Package Invoice
//           </h1>
//           <p className="text-xs text-slate-600 mt-1">
//             INV #{client.id.slice(0, 6).toUpperCase()}
//           </p>

//           <div className="mt-2 inline-block px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-md border border-green-300">
//             {formatDate(new Date())}
//           </div>
//         </div>

//         {/* User + Logo */}
//         <div className="flex justify-between items-center px-5 mt-3">
//           <div>
//             <h2 className="text-base font-semibold">{client.name}</h2>
//             <p className="text-xs text-indigo-500">{client.phone}</p>
//             <p className="text-[11px] text-slate-500">
//               {client.area}, {client.city}
//             </p>
//           </div>

//           <Image src="/logo.png" alt="Logo" width={50} height={50} />
//         </div>

//         {/* One-Time Charges Section */}
//         <div className="px-2 mt-1">
//           <div className="flex justify-between items-center mb-1">
//             <p className="bg-orange-100 text-orange-700 font-semibold text-xs px-1.5 py-0.5 rounded-md">
//               🔧 One-Time Charges
//             </p>
//             <button
//               onClick={() => setShowAddCharges(!showAddCharges)}
//               className="text-xs text-blue-600 hover:text-blue-700 font-medium"
//             >
//               {showAddCharges ? "Cancel" : "+ Add Charge"}
//             </button>
//           </div>

//           {showAddCharges && (
//             <div className="bg-slate-50 rounded-lg p-1.5 mb-1 space-y-1">
//               <div className="flex gap-1">
//                 <input
//                   type="text"
//                   placeholder="Item (e.g., Router)"
//                   value={newCharge.name}
//                   onChange={(e) =>
//                     setNewCharge({ ...newCharge, name: e.target.value })
//                   }
//                   className="flex-1 px-2 py-0.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//                 <input
//                   type="number"
//                   placeholder="Amount"
//                   value={newCharge.amount}
//                   onChange={(e) =>
//                     setNewCharge({ ...newCharge, amount: e.target.value })
//                   }
//                   className="w-20 px-2 py-0.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//                 <button
//                   onClick={handleAddCharge}
//                   className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
//                 >
//                   Add
//                 </button>
//               </div>
//             </div>
//           )}

//           {additionalCharges.length > 0 && (
//             <div className="space-y-1.5">
//               {additionalCharges.map((charge, index) => (
//                 <div
//                   key={index}
//                   className="flex justify-between text-xs items-center bg-slate-50 px-2 py-1.5 rounded"
//                 >
//                   <span className="text-slate-700">{charge.name}</span>
//                   <div className="flex items-center gap-1.5">
//                     <span className="text-slate-800 font-medium">
//                       {formatPKR(charge.amount)}
//                     </span>
//                     <button
//                       onClick={() => handleRemoveCharge(index)}
//                       className="text-red-500 hover:text-red-700 text-base font-bold"
//                     >
//                       ×
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Divider */}
//         <div className="px-5 mt-3">
//           <div className="h-px bg-slate-200" />
//         </div>

//         {/* Package Detail Section */}
//         <div className="px-5 mt-3">
//           <p className="bg-indigo-100 text-indigo-700 font-semibold text-xs px-2 py-1 rounded-md inline-block mb-1.5">
//             📦 Package Detail
//           </p>

//           <div className="space-y-0.5">
//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">Package</span>
//               <span className="text-slate-800 font-medium">
//                 {client.package?.name}
//               </span>
//             </div>
//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">Duration</span>
//               <span className="text-slate-800 font-medium">1 Month</span>
//             </div>
//           </div>
//         </div>

//         {/* Divider */}
//         <div className="px-5 mt-3">
//           <div className="h-px bg-slate-200" />
//         </div>

//         {/* 💰 Payment Detail Section */}
//         <div className="px-5 mt-3 space-y-0.5">
//           <p className="bg-indigo-100 text-indigo-700 font-semibold text-xs px-2 py-1 rounded-md inline-block mb-1.5">
//             💰 Payment Detail
//           </p>

//           <div className="space-y-0.5">
//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">Package Charges</span>
//               <span className="text-slate-800 font-medium">
//                 {formatPKR(packagePrice)}
//               </span>
//             </div>

//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">One-Time Charges</span>
//               <span className="text-slate-800 font-medium">
//                 {formatPKR(additionalTotal)}
//               </span>
//             </div>

//             <div className="h-px bg-slate-300 my-1.5" />

//             <div className="flex justify-between text-xs font-semibold">
//               <span className="text-slate-700">Subtotal</span>
//               <span className="text-slate-800">{formatPKR(total)}</span>
//             </div>

//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">Discount</span>
//               <span className="text-slate-800 font-medium">{formatPKR(0)}</span>
//             </div>

//             <div className="h-px bg-slate-300 my-1.5" />

//             <div className="flex justify-between text-sm font-bold bg-indigo-50 px-2 py-1.5 rounded mt-1.5">
//               <span className="text-indigo-700">Grand Total</span>
//               <span className="text-indigo-700">{formatPKR(total)}</span>
//             </div>
//           </div>
//         </div>

//         {/* Divider */}
//         <div className="px-5 mt-3">
//           <div className="h-px bg-slate-200" />
//         </div>

//         {/* 💳 Payment Status Section */}
//         <div className="px-5 mt-3 space-y-0.5">
//           <p className="bg-indigo-100 text-indigo-700 font-semibold text-xs px-2 py-1 rounded-md inline-block mb-1.5">
//             💳 Payment Status
//           </p>

//           <div className="space-y-0.5">
//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">Paid Amount</span>
//               <span className="text-green-600 font-semibold">
//                 {formatPKR(paid)}
//               </span>
//             </div>

//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">Remaining Amount</span>
//               <span
//                 className={`font-semibold ${remaining > 0.01 ? "text-red-600" : remaining < -0.01 ? "text-blue-600" : "text-green-600"}`}
//               >
//                 {formatPKR(remaining)}
//               </span>
//             </div>

//             {client.latestPaymentDate && (
//               <div className="flex justify-between text-xs">
//                 <span className="text-slate-600">Last Payment</span>
//                 <span className="text-slate-800 font-medium">
//                   {formatDate(client.latestPaymentDate)}
//                 </span>
//               </div>
//             )}

//             <div className="flex justify-between text-xs">
//               <span className="text-slate-600">Expiry Date</span>
//               <span className="text-slate-800 font-medium">
//                 {formatDate(client.expiryDate || new Date())}
//               </span>
//             </div>

//             <div className="h-px bg-slate-300 my-1.5" />

//             <div className="flex justify-between items-center pt-0.5">
//               <span className="text-slate-600 text-xs">Status</span>
//               <span
//                 className={`px-2 py-1 rounded-md text-xs font-bold ${statusColor}`}
//               >
//                 {effectiveStatus === "PAID"
//                   ? "✅ "
//                   : effectiveStatus === "PARTIAL"
//                     ? "⏳ "
//                     : "❌ "}
//                 {effectiveStatus}
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* TOTAL PAID BOX - Summary */}
//         <div className="px-5 mt-4 mb-6">
//           <div className="bg-linear-to-r from-indigo-500 to-blue-600 rounded-lg px-3 py-2 flex justify-between items-center shadow-md">
//             <span className="text-white text-xs font-semibold">Total Paid</span>
//             <span className="text-xl font-bold text-white">
//               {formatPKR(paid)}
//             </span>
//           </div>
//         </div>

//         {/* Bottom Cut */}
//         <div className="absolute bottom-0 left-0 right-0 h-6 bg-[radial-gradient(circle,white_6px,transparent_7px)] bg-size-[20px_20px]" />
//       </div>

//       {/* Payment Modal */}
//       {client && remaining > 0 && showPaymentModal && (
//         <PaymentModal
//           isOpen={showPaymentModal}
//           onClose={() => setShowPaymentModal(false)}
//           amount={remaining}
//           title={`Invoice #${client.id.slice(0, 6).toUpperCase()}`}
//           description={`Payment for ${client.name}`}
//           metadata={{
//             referenceType: "invoice",
//             referenceId: client.id,
//             clientId: client.id,
//             invoiceId: client.id,
//           }}
//           additionalCharges={
//             additionalCharges.length > 0 ? additionalCharges : undefined
//           }
//         />
//       )}

//       {/* Print */}
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
