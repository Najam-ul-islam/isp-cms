"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SaaSInvoiceDetails from "@/components/saas/SaaSInvoiceDetails";

export const dynamic = "force-dynamic";

export default function SaaSInvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  const invoiceId = params.invoiceId as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/saas/invoices/${invoiceId}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();
          setInvoice(data);
        } else if (response.status === 401) {
          router.push("/login");
        } else if (response.status === 404) {
          setError("Invoice not found");
        } else {
          setError("Failed to load invoice");
        }
      } catch (err) {
        console.error("Error fetching invoice:", err);
        setError("Failed to load invoice details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId, router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SaaSInvoiceDetails
        companyId={companyId}
        invoice={invoice}
        error={error}
      />
    </div>
  );
}
