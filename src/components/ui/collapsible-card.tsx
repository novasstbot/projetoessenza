"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CollapsibleCard({
  title,
  actions,
  defaultOpen = true,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-left"
          aria-expanded={open}
        >
          <ChevronDown
            className={cn("size-4 text-muted-foreground transition-transform", !open && "-rotate-90")}
          />
          <CardTitle className="text-base">{title}</CardTitle>
        </button>
        {actions}
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}
