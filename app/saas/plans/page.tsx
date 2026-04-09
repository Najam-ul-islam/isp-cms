import { getPlans } from "@/lib/saas/planService";
import PlansTable from "@/components/saas/PlansTable";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const plans = await getPlans();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">
          Subscription Plans
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage pricing plans and features
        </p>
      </div>

      <PlansTable plans={plans} />
    </div>
  );
}
