import { Link, useParams } from "react-router-dom";
import { db } from "@/data";
import { useAsync } from "@/data/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@shared/components/ui-bits";
import { PermitShell } from "../components/PermitShell";
import { PermitCaseDetailView } from "../components/PermitCaseDetailView";
import { ArrowLeft } from "lucide-react";

export default function PermitCaseDetailPage() {
  const { id = "" } = useParams();
  const { data: employees = [] } = useAsync(() => db.employees.list(), [id]);
  const { data: categories = [] } = useAsync(() => db.permitCategories.list(), [id]);
  const { data: templates = [] } = useAsync(() => db.permitChecklistTemplates.list(), [id]);
  const { data: cases = [] } = useAsync(() => db.permitCases.list(), [id]);
  const { data: items = [] } = useAsync(() => db.permitCaseItems.list(), [id]);

  const permitCase = cases.find((entry) => entry.id === id);
  const caseItems = items.filter((entry) => entry.caseId === id).sort((a, b) => a.sortOrder - b.sortOrder);
  const employee = employees.find((entry) => entry.id === permitCase?.employeeId);

  return (
    <PermitShell
      title={employee ? `${employee.firstName} ${employee.lastName}` : "Predmet"}
      description="Pregled i obrada konkretnog predmeta dozvole."
      actions={<Button asChild variant="outline"><Link to="/dozvole"><ArrowLeft className="h-4 w-4 mr-2" /> Nazad</Link></Button>}
    >
      <Card>
        <CardHeader><CardTitle className="text-base">Detalj predmeta</CardTitle></CardHeader>
        <CardContent>
          {!permitCase ? (
            <EmptyState title="Predmet nije pronađen" description="Provjeri URL ili se vrati na listu predmeta." />
          ) : (
            <PermitCaseDetailView permitCase={permitCase} employees={employees} categories={categories} templates={templates} items={caseItems} />
          )}
        </CardContent>
      </Card>
    </PermitShell>
  );
}
