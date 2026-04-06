import { getAllSubscriptions, getSubscriptionStats } from "@/lib/saas/subscriptionService";
import { getPlans } from "@/lib/saas/planService";
import SubscriptionsTable from "@/components/saas/SubscriptionsTable";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const [subscriptionsResult, plans] = await Promise.all([
    getAllSubscriptions().then(async (subscriptions) => {
      const stats = {
        total: subscriptions.length,
        active: subscriptions.filter((s) => s.status === "active").length,
        expired: subscriptions.filter((s) => s.status === "expired").length,
        cancelled: subscriptions.filter((s) => s.status === "cancelled").length,
      };
      return { subscriptions, stats };
    }),
    getPlans(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Subscriptions</h2>
        <p className="text-sm text-gray-500 mt-1">
          Monitor and manage company subscriptions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-lg border border-gray-200 bg-gray-50">
          <p className="text-sm font-medium text-gray-700">Total</p>
          <p className="text-3xl font-bold mt-2 text-gray-900">
            {subscriptionsResult.stats.total}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-green-200 bg-green-50">
          <p className="text-sm font-medium text-green-700">Active</p>
          <p className="text-3xl font-bold mt-2 text-green-600">
            {subscriptionsResult.stats.active}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-orange-200 bg-orange-50">
          <p className="text-sm font-medium text-orange-700">Expired</p>
          <p className="text-3xl font-bold mt-2 text-orange-600">
            {subscriptionsResult.stats.expired}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-700">Cancelled</p>
          <p className="text-3xl font-bold mt-2 text-red-600">
            {subscriptionsResult.stats.cancelled}
          </p>
        </div>
      </div>

      <SubscriptionsTable
        subscriptions={subscriptionsResult.subscriptions}
        plans={plans}
      />
    </div>
  );
}
