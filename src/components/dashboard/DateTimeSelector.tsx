"use client";

import { CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/Input";

type DateTimeSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function DateTimeSelector({ value, onChange }: DateTimeSelectorProps) {
  return (
    <label className="control">
      <span className="control__label">
        <CalendarClock size={16} aria-hidden="true" />
        Viewing time
      </span>
      <Input type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
