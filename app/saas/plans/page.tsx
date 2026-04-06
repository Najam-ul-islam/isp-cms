import { getPlans } from "@/lib/saas/planService";
import PlansTable from "@/components/saas/PlansTable";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const plans = await getPlans();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Subscription Plans</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage pricing plans and features
        </p>
      </div>

      <PlansTable plans={plans} />
    </div>
  );
}
