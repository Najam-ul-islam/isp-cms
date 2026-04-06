"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, AlertCircle, CheckCircle, CreditCard } from "lucide-react";
import PaymentModal from "@/components/payments/PaymentModal";

interface Subscription {
  id: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: string;
  plan: {
    name: string;
    price: number;
    duration: number;
    description: string | null;
    features: Record<string, any>;
  };
}

interface ClientLimit {
  canAdd: boolean;
  current: number;
  max: number;
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [clientLimit, setClientLimit] = useState<ClientLimit | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetch("/api/subscription")
      .then((res) => res.json())
      .then((data) => {
        setSubscription(data.subscription);
        setClientLimit(data.clientLimit);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading subscription details...</p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subscription</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your plan and billing
          </p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Active Subscription
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Contact your platform administrator to subscribe to a plan.
          </p>
        </div>
      </div>
    );
  }

  const daysRemaining = Math.ceil(
    (new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = subscription.status === "expired" || daysRemaining <= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Subscription</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage your plan and billing
        </p>
      </div>

      {/* Status Alert */}
      {isExpired && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-900">
                Subscription Expired
              </p>
              <p className="text-xs text-red-700">
                Your subscription has expired. Contact your administrator to renew.
              </p>
            </div>
          </div>
        </div>
      )}

      {isExpiringSoon && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-sm font-semibold text-orange-900">
                Expiring Soon
              </p>
              <p className="text-xs text-orange-700">
                Your subscription expires in {daysRemaining} days. Contact your administrator to renew.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {subscription.plan.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {subscription.plan.description || "Your current plan"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                subscription.status === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {subscription.status === "active" ? (
                <CheckCircle className="w-4 h-4 mr-1" />
              ) : (
                <AlertCircle className="w-4 h-4 mr-1" />
              )}
              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
            </span>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Renew Plan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Price</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              PKR {subscription.plan.price.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              per {subscription.plan.duration} days
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Start Date</p>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="w-5 h-5 text-gray-400" />
              <p className="text-lg font-semibold text-gray-900">
                {new Date(subscription.startDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">End Date</p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-5 h-5 text-gray-400" />
              <p className="text-lg font-semibold text-gray-900">
                {new Date(subscription.endDate).toLocaleDateString()}
              </p>
            </div>
            {!isExpired && (
              <p className="text-xs text-blue-600 mt-1">
                {daysRemaining} days remaining
              </p>
            )}
          </div>
        </div>

        {/* Features */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-3">
            Enabled Features
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(subscription.plan.features).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {key === "maxClients" ? "Max Clients" : key}
                  </p>
                </div>
                <div>
                  {key === "maxClients" ? (
                    <span className="text-sm text-gray-600">
                      {value === -1 ? "Unlimited" : value}
                    </span>
                  ) : (value as boolean) ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Client Usage */}
        {clientLimit && clientLimit.max !== -1 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              Client Usage
            </h4>
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-800">
                {clientLimit.current} / {clientLimit.max} clients
              </p>
              <p
                className={`text-sm font-medium ${
                  clientLimit.canAdd ? "text-green-600" : "text-red-600"
                }`}
              >
                {clientLimit.canAdd
                  ? `${clientLimit.max - clientLimit.current} slots available`
                  : "Limit reached"}
              </p>
            </div>
            <div className="mt-2 bg-blue-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    (clientLimit.current / clientLimit.max) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {subscription && showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={subscription.plan.price}
          title={`Renew ${subscription.plan.name}`}
          description={`${subscription.plan.duration} days subscription renewal`}
          metadata={{
            referenceType: "subscription",
            referenceId: subscription.id,
            clientId: "",
          }}
        />
      )}
    </div>
  );
}
