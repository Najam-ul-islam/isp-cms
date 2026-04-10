"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, ArrowDownRight } from "lucide-react";

interface OtherIncomeData {
  totalOtherIncome: number;
  count: number;
}

interface OtherIncomeCardProps {
  startDate?: string;
  endDate?: string;
}

export default function OtherIncomeCard({ startDate, endDate }: OtherIncomeCardProps) {
  const router = useRouter();
  const [data, setData] = useState<OtherIncomeData>({ totalOtherIncome: 0, count: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchOtherIncome = useCallback(async (signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/dashboard/other-income?${params.toString()}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch other income`);
      }

      const json = await res.json();
      return json as OtherIncomeData;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      console.error("[OtherIncomeCard] Fetch error:", err);
      throw err;
    }
  }, [startDate, endDate]);

  useEffect(() => {
    isMounted.current = true;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setIsLoading(true);
    fetchOtherIncome(signal)
      .then((result) => {
        if (!isMounted.current) return;
        setData(result);
        setError(null);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted.current) return;
        setError(err.message);
        setIsLoading(false);
      });

    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchOtherIncome]);

  const isPositive = data.totalOtherIncome >= 0;
  const displayValue = Math.abs(data.totalOtherIncome);

  if (isLoading) {
    return (
      <div className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-indigo-200/60 dark:border-indigo-500/20">
        <div className="flex items-start justify-between mb-3">
          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
            <TrendingUp className="w-5 h-5 text-gray-300 dark:text-gray-600 animate-pulse" />
          </div>
        </div>
        <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-rose-200/60 dark:border-rose-500/20">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-rose-500 dark:text-rose-400">Other Income</p>
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10">
            <ArrowDownRight className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
        </div>
        <p className="text-sm text-rose-500 dark:text-rose-400">Failed to load</p>
      </div>
    );
  }

  return (
    <button
      onClick={() => router.push("/dashboard/product-sales")}
      className={`group bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm text-left border transition-all duration-300 cursor-pointer
        hover:shadow-lg hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900
        ${
          isPositive
            ? "border-emerald-200/60 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-emerald-50/80 dark:hover:bg-emerald-500/5 hover:shadow-emerald-500/10 focus-visible:ring-emerald-500/50"
            : "border-rose-200/60 dark:border-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500/40 hover:bg-rose-50/80 dark:hover:bg-rose-500/5 hover:shadow-rose-500/10 focus-visible:ring-rose-500/50"
        }`}
      aria-label={`Other Income: PKR ${displayValue.toLocaleString()}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Other Income</p>
          {data.count > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {data.count} sale{data.count !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div
          className={`p-2 rounded-lg transition-transform duration-200 group-hover:scale-110 ${
            isPositive
              ? "bg-emerald-50 dark:bg-emerald-500/10"
              : "bg-rose-50 dark:bg-rose-500/10"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ArrowDownRight className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          )}
        </div>
      </div>
      <p
        className={`text-2xl font-semibold bg-clip-text text-transparent ${
          isPositive
            ? "bg-linear-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300"
            : "bg-linear-to-r from-rose-600 to-rose-500 dark:from-rose-400 dark:to-rose-300"
        }`}
      >
        {isPositive ? "" : "-"}Rs {displayValue.toLocaleString()}
      </p>
    </button>
  );
}
