import type { HourEntry } from "@/data/types";
import { today } from "./dates";

export function exportHoursCSV(rows: HourEntry[], employees: any[], projects: any[], phases: any[]) {
  const head = ["Datum", "Radnik", "Projekat", "Faza", "Sati", "Satnica", "Trošak", "Status", "Napomena"];
  const lines = [head.join(";")];
  for (const h of rows) {
    const emp = employees.find(e => e.id === h.employeeId);
    const pr = projects.find(p => p.id === h.projectId);
    const ph = phases.find(p => p.id === h.phaseId);
    lines.push([
      h.date,
      emp ? `${emp.firstName} ${emp.lastName}` : "",
      pr?.name || "",
      ph?.name || "",
      String(h.hours).replace(".", ","),
      String(h.hourlyRate).replace(".", ","),
      String((h.hours * h.hourlyRate).toFixed(2)).replace(".", ","),
      h.approved ? "odobreno" : "ceka",
      (h.notes || "").replace(/;/g, ","),
    ].map(x => `"${x}"`).join(";"));
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `sati-${today()}.csv`; a.click();
  URL.revokeObjectURL(url);
}
