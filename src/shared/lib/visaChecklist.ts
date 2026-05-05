import type { VisaKind } from "@/data/types";

export interface ChecklistItem { slug: string; label: string; }

export const VISA_CHECKLISTS: Record<VisaKind, ChecklistItem[]> = {
  rad: [
    { slug: "kopija_pasosa", label: "Kopija pasoša" },
    { slug: "certifikat", label: "Certifikat" },
    { slug: "zahtjev", label: "Zahtjev" },
    { slug: "potvrda_doprinosi", label: "Potvrda o doprinosima" },
    { slug: "potvrda_porezi", label: "Potvrda o porezima" },
    { slug: "potvrda_pdv", label: "Potvrda o PDV-u" },
    { slug: "solventnost", label: "Solventnost" },
    { slug: "uplatnica_100", label: "Uplatnica 100 KM" },
    { slug: "uplatnica_10_a", label: "Uplatnica 10 KM (A)" },
    { slug: "uplatnica_10_b", label: "Uplatnica 10 KM (B)" },
  ],
  boravak: [
    { slug: "uvjerenje_nekaznjavanju", label: "Uvjerenje o nekažnjavanju" },
    { slug: "kopija_pasosa", label: "Kopija pasoša" },
    { slug: "zahtjev", label: "Zahtjev za boravak" },
    { slug: "ostalo", label: "Ostalo" },
  ],
};
