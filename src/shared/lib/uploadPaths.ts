// Centralizirane "putanje" za upload fajlova u Appwrite Storage bucket.
// Appwrite Storage nema prave foldere, ali svaki fajl uploadujemo s nazivom
// koji počinje ovim prefiksom (npr. "projects/<id>/documents/ugovor.pdf"),
// pa u Console-u i UI-ju imaš čistu, "folder-like" organizaciju.

const clean = (s?: string) =>
  (s || "misc")
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9_\-\/\.]+/g, "_")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");

export const uploadPaths = {
  projectDocument: (projectId: string, kind?: string) =>
    clean(`projects/${projectId}/documents${kind ? "/" + kind : ""}`),
  projectPhoto: (projectId: string, phaseId?: string) =>
    clean(`projects/${projectId}/photos${phaseId ? "/" + phaseId : ""}`),
  projectInvoice: (projectId: string) =>
    clean(`projects/${projectId}/invoices`),
  projectExpenseReceipt: (projectId: string) =>
    clean(`projects/${projectId}/expenses`),
  projectCashReceipt: (projectId: string) =>
    clean(`projects/${projectId}/cash`),

  employeeDocument: (employeeId: string, kind?: string) =>
    clean(`employees/${employeeId}/documents${kind ? "/" + kind : ""}`),
  visaAttachment: (employeeId: string, kind: string, slug: string) =>
    clean(`employees/${employeeId}/visas/${kind}/${slug}`),

  expenseReceipt: () => clean(`expenses/receipts`),
  cashJustification: (paymentId: string) => clean(`cash/justifications/${paymentId}`),

  misc: () => "misc",
};
