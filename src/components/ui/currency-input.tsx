"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseBRL(raw: string): number {
  const cleaned = raw.replace(/[^\d,]/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

type CurrencyInputProps = {
  value: number;
  onChange: (value: number) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">;

// Standard BRL value field: selects all on focus (so typing over "0,00"
// replaces it instead of producing "05,00"), and pads to 2 decimals on
// blur even if the user never typed a comma.
export function CurrencyInput({ value, onChange, ...props }: CurrencyInputProps) {
  const [text, setText] = useState(() => formatBRL(value));
  const [focused, setFocused] = useState(false);
  const [syncedValue, setSyncedValue] = useState(value);

  // Keep the display in sync when `value` changes from outside (e.g. form
  // reset) without touching it while the user is actively typing.
  if (!focused && value !== syncedValue) {
    setSyncedValue(value);
    setText(formatBRL(value));
  }

  return (
    <Input
      {...props}
      inputMode="decimal"
      value={text}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onChange={(e) => setText(e.target.value.replace(/[^\d,]/g, ""))}
      onBlur={() => {
        const parsed = parseBRL(text);
        onChange(parsed);
        setText(formatBRL(parsed));
        setFocused(false);
      }}
    />
  );
}
