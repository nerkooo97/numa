import type { ReactNode } from "react";
import { PageHeader } from "@shared/components/ui-bits";

export function PermitShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </div>
  );
}
