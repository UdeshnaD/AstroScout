import { CloudMoon, Moon, Telescope } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatPercent } from "@/lib/format";
import type { SpotPlan } from "@/types/spot";

type SkySummaryProps = {
  plan?: SpotPlan;
};

export function SkySummary({ plan }: SkySummaryProps) {
  if (!plan) {
    return (
      <Card className="summary-grid">
        <Metric icon={CloudMoon} label="Cloud cover" value="--" />
        <Metric icon={Moon} label="Moon" value="--" />
        <Metric icon={Telescope} label="Viewing window" value="--" />
      </Card>
    );
  }

  return (
    <Card className="summary-grid">
      <Metric icon={CloudMoon} label="Cloud cover" value={formatPercent(plan.weather.cloudCover)} />
      <Metric
        icon={Moon}
        label={plan.astronomy.moonPhase}
        value={`${formatPercent(plan.astronomy.moonIllumination)} lit`}
      />
      <Metric icon={Telescope} label="Viewing window" value={plan.astronomy.bestViewingWindow} />
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof CloudMoon;
  label: string;
  value: string;
}) {
  return (
    <div className="metric">
      <Icon size={20} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
