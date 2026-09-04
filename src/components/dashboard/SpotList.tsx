import { SpotCard } from "@/components/dashboard/SpotCard";
import type { SpotPlan } from "@/types/spot";

type SpotListProps = {
  plans: SpotPlan[];
};

export function SpotList({ plans }: SpotListProps) {
  return (
    <div className="spot-list">
      {plans.map((plan, index) => (
        <SpotCard key={plan.id} plan={plan} rank={index + 1} />
      ))}
    </div>
  );
}
