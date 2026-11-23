import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DemoBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-gold/40 bg-rose/40 text-plum"
    >
      <FlaskConical className="size-3.5" />
      Dados fictícios — demonstrativo
    </Badge>
  );
}
