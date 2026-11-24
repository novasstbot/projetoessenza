"use client";

import { Input } from "@/components/ui/input";

function formatCnpjCpf(digits: string) {
  const d = digits.slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

type CnpjCpfInputProps = {
  value?: string;
  onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">;

export function CnpjCpfInput({ value, onChange, ...props }: CnpjCpfInputProps) {
  return (
    <Input
      {...props}
      inputMode="numeric"
      value={value ?? ""}
      onChange={(e) => onChange(formatCnpjCpf(e.target.value.replace(/\D/g, "")))}
    />
  );
}
