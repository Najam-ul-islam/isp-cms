"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SaaSInvoicesTable from "@/components/saas/SaaSInvoicesTable";

export const dynamic = "force-dynamic";

export default function SaaSInvoicesPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalBilled: 0,
    totalPaid: 0,
    totalRemaining: 0,
    totalInvoices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/saas/companies/${companyId}/invoices`, {
          credentials: "include",
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();
          setInvoices(data.invoices || []);
          setStats(data.stats || {
            totalBilled: 0,
            totalPaid: 0,
            totalRemaining: 0,
            totalInvoices: 0,
          });
        } else if (response.status === 401) {
          router.push("/login");
        } else {
          setError("Failed to load invoices");
        }
      } catch (err) {
        console.error("Error fetching SaaS invoices:", err);
        setError("Failed to load invoices. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [companyId, router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SaaSInvoicesTable
        companyId={companyId}
        invoices={invoices}
        stats={stats}
        error={error}
      />
    </div>
  );
}
