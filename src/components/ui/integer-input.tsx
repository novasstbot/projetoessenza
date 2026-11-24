"use client";

import { Input } from "@/components/ui/input";

type IntegerInputProps = {
  value: number;
  onChange: (value: number) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">;

// Selects all on focus so typing replaces the current value instead of
// prepending to it (e.g. "0" + "1" + "0" becoming "010" instead of "10").
export function IntegerInput({ value, onChange, ...props }: IntegerInputProps) {
  return (
    <Input
      {...props}
      type="number"
      inputMode="numeric"
      value={value}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const parsed = e.target.valueAsNumber;
        onChange(Number.isFinite(parsed) ? parsed : 0);
      }}
    />
  );
}
