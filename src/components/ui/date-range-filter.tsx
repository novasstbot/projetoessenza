"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type DateRange = { from: string; to: string } | null;

type Preset = "hoje" | "semana" | "mes" | "personalizado";

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function computeRange(preset: "hoje" | "semana" | "mes"): { from: string; to: string } {
  const now = new Date();
  if (preset === "hoje") {
    const iso = toISO(now);
    return { from: iso, to: iso };
  }
  if (preset === "semana") {
    const diasDesdeSegunda = (now.getDay() + 6) % 7;
    const segunda = new Date(now);
    segunda.setDate(now.getDate() - diasDesdeSegunda);
    const domingo = new Date(segunda);
    domingo.setDate(segunda.getDate() + 6);
    return { from: toISO(segunda), to: toISO(domingo) };
  }
  const primeiro = new Date(now.getFullYear(), now.getMonth(), 1);
  const ultimo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toISO(primeiro), to: toISO(ultimo) };
}

export function DateRangeFilter({ onChange }: { onChange: (range: DateRange) => void }) {
  const [preset, setPreset] = useState<Preset | null>(null);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  function selectPreset(p: "hoje" | "semana" | "mes") {
    if (preset === p) {
      setPreset(null);
      onChange(null);
      return;
    }
    setPreset(p);
    onChange(computeRange(p));
  }

  function togglePersonalizado() {
    if (preset === "personalizado") {
      setPreset(null);
      onChange(null);
      return;
    }
    setPreset("personalizado");
    if (customFrom && customTo) onChange({ from: customFrom, to: customTo });
  }

  function updateCustom(from: string, to: string) {
    setCustomFrom(from);
    setCustomTo(to);
    if (from && to) onChange({ from, to });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant={preset === "hoje" ? "default" : "outline"}
        onClick={() => selectPreset("hoje")}
      >
        Hoje
      </Button>
      <Button
        type="button"
        size="sm"
        variant={preset === "semana" ? "default" : "outline"}
        onClick={() => selectPreset("semana")}
      >
        Esta semana
      </Button>
      <Button
        type="button"
        size="sm"
        variant={preset === "mes" ? "default" : "outline"}
        onClick={() => selectPreset("mes")}
      >
        Este mês
      </Button>
      <Button
        type="button"
        size="sm"
        variant={preset === "personalizado" ? "default" : "outline"}
        onClick={togglePersonalizado}
      >
        Personalizado
      </Button>
      {preset === "personalizado" && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => updateCustom(e.target.value, customTo)}
            className="w-36"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => updateCustom(customFrom, e.target.value)}
            className="w-36"
          />
        </div>
      )}
    </div>
  );
}
