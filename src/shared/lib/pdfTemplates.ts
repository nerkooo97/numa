import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Employee } from "@/data/types";
import { fmtDate } from "@shared/lib/format";

async function makeDoc(title: string, lines: { label: string; value: string }[]) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 800;
  page.drawText("NUMA d.o.o.", { x: 50, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 30;
  page.drawText(title, { x: 50, y, size: 18, font: bold });
  y -= 30;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 25;
  for (const l of lines) {
    page.drawText(l.label, { x: 50, y, size: 11, font: bold });
    page.drawText(l.value || "—", { x: 220, y, size: 11, font });
    y -= 22;
  }
  y -= 20;
  page.drawText(`Datum: ${fmtDate(new Date().toISOString())}`, { x: 50, y, size: 10, font });
  y -= 16;
  page.drawText("Potpis i pečat: __________________________", { x: 50, y, size: 10, font });
  return pdf;
}

function download(bytes: Uint8Array, filename: string) {
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([ab], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const employeeFields = (e: Employee) => [
  { label: "Ime i prezime", value: `${e.firstName} ${e.lastName}` },
  { label: "Broj pasoša / JMBG", value: e.identifier },
  { label: "Državljanstvo", value: e.citizenship },
  { label: "Datum rođenja", value: fmtDate(e.birthDate) },
  { label: "Kontakt", value: e.contact || "" },
];

export async function genWorkPermitBundle(emp: Employee) {
  const titles = [
    "ZAHTJEV ZA RADNU DOZVOLU",
    "POTVRDA O DOPRINOSIMA",
    "POTVRDA O POREZIMA",
    "POTVRDA O PDV-u",
    "POTVRDA O SOLVENTNOSTI",
    "UPLATNICA — 100 KM (taksa)",
    "UPLATNICA — 10 KM (administrativna taksa)",
    "UPLATNICA — 10 KM (administrativna taksa 2)",
    "CERTIFIKAT POSLODAVCA",
  ];
  const merged = await PDFDocument.create();
  for (const t of titles) {
    const d = await makeDoc(t, employeeFields(emp));
    const copied = await merged.copyPages(d, d.getPageIndices());
    copied.forEach(p => merged.addPage(p));
  }
  const bytes = await merged.save();
  download(bytes, `Radna_dozvola_${emp.lastName}_${emp.firstName}.pdf`);
}

export async function genResidenceBundle(emp: Employee) {
  const titles = [
    "ZAHTJEV ZA BORAVAK",
    "UVJERENJE O NEKAŽNJAVANJU",
    "KOPIJA PASOŠA — popratni list",
    "OSTALA DOKUMENTACIJA",
  ];
  const merged = await PDFDocument.create();
  for (const t of titles) {
    const d = await makeDoc(t, employeeFields(emp));
    const copied = await merged.copyPages(d, d.getPageIndices());
    copied.forEach(p => merged.addPage(p));
  }
  const bytes = await merged.save();
  download(bytes, `Boravak_${emp.lastName}_${emp.firstName}.pdf`);
}
