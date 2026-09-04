"use client";

import { Footprints, Navigation, TrainFront } from "lucide-react";
import { TabButton } from "@/components/ui/Tabs";
import type { TravelMode } from "@/types/trip";

type TravelModeSelectorProps = {
  value: TravelMode;
  onChange: (value: TravelMode) => void;
};

const options: Array<{ value: TravelMode; label: string; icon: typeof Navigation }> = [
  { value: "driving", label: "Drive", icon: Navigation },
  { value: "public_transport", label: "Transit", icon: TrainFront },
  { value: "walking", label: "Walk", icon: Footprints }
];

export function TravelModeSelector({ value, onChange }: TravelModeSelectorProps) {
  return (
    <div className="control">
      <span className="control__label">Travel</span>
      <div className="tab-group" role="tablist" aria-label="Travel mode">
        {options.map((option) => {
          const Icon = option.icon;

          return (
            <TabButton
              key={option.value}
              active={value === option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              <Icon size={15} aria-hidden="true" />
              {option.label}
            </TabButton>
          );
        })}
      </div>
    </div>
  );
}
