import { Construction } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export function ModuleStub({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Construction className="size-8 text-gold" />
          <p className="font-medium text-foreground">Módulo em construção</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Esta tela ainda não tem funcionalidade implementada — ela será
            construída em uma próxima etapa, junto com as regras de negócio
            e o banco de dados específicos deste módulo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
