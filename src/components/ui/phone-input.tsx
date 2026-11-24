"use client";

import { Input } from "@/components/ui/input";

function formatPhone(digits: string) {
  const d = digits.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

type PhoneInputProps = {
  value?: string;
  onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">;

export function PhoneInput({ value, onChange, ...props }: PhoneInputProps) {
  return (
    <Input
      {...props}
      inputMode="tel"
      value={value ?? ""}
      onChange={(e) => onChange(formatPhone(e.target.value.replace(/\D/g, "")))}
    />
  );
}
