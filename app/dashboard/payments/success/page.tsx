"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");

    if (sessionId) {
      // Verify payment status
      fetch(`/api/payments/status?transactionId=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            setVerified(true);
          }
        })
        .catch(console.error)
        .finally(() => setVerifying(false));
    } else {
      setVerifying(false);
      setVerified(true);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 max-w-md w-full text-center">
        {verifying ? (
          <>
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verifying Payment...
            </h2>
            <p className="text-sm text-gray-600">
              Please wait while we confirm your payment
            </p>
          </>
        ) : (
          <>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Your payment has been processed successfully. Your subscription is
              now active.
            </p>
            <div className="space-y-3">
              <Link
                href="/dashboard/subscription"
                className="block w-full px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Subscription
              </Link>
              <Link
                href="/dashboard"
                className="block w-full px-6 py-3 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 max-w-md w-full text-center">
          <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
