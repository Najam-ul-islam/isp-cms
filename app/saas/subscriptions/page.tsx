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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">
          Subscriptions
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Monitor and manage company subscriptions
        </p>
      </div>

      <SubscriptionsTable
        subscriptions={subscriptionsResult.subscriptions}
        plans={plans}
      />
    </div>
  );
}
