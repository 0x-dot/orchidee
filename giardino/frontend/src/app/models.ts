export interface User { id: number; username: string; }

export type Sheet = Record<string, string>;

export interface Plant {
  id: number;
  userId: number;
  owner: string;
  botanicalName: string;
  nickname: string;
  acquiredAt: string;
  public: boolean;
  sheet: Sheet;
}

export interface FieldDef { key: string; label: string; long?: boolean; hint?: string; }

// Stessi campi delle schede originali, nello stesso ordine
export const SHEET_FIELDS: FieldDef[] = [
  { key: 'origine', label: 'Origine e habitat', long: true, hint: 'Es: Madagascar e Africa orientale. Epifita in foreste umide.' },
  { key: 'crescita', label: 'Tipo di crescita', hint: 'Es: Monopodiale, compatta' },
  { key: 'luce', label: 'Luce', hint: 'Es: Media (8.000–12.000 lux), no sole diretto' },
  { key: 'temperatura', label: 'Temperatura', long: true, hint: 'Giorno: 22–26 °C · Notte: 16–18 °C' },
  { key: 'umidita', label: 'Umidità', hint: 'Es: 60–80%' },
  { key: 'ventilazione', label: 'Ventilazione', hint: 'Es: Costante ma delicata' },
  { key: 'substrato', label: 'Substrato / Montaggio', hint: 'Es: Bark fine in vaso trasparente' },
  { key: 'annaffiatura', label: 'Annaffiatura', long: true, hint: 'Estate: … · Inverno: …' },
  { key: 'acqua', label: 'Tipo di acqua', hint: 'Piovana, distillata, rubinetto decantato…' },
  { key: 'fertilizzazione', label: 'Fertilizzazione', hint: 'Es: 20-20-20 a 1/4 dose ogni 2 annaffiature' },
  { key: 'riposo', label: 'Riposo', hint: 'Es: Leggero in inverno' },
  { key: 'fioritura', label: 'Fioritura', hint: 'Es: Primavera–estate, profumata di notte' },
  { key: 'note', label: 'Note di coltivazione', long: true },
];

export function emptyPlant(): Plant {
  const sheet: Sheet = {};
  SHEET_FIELDS.forEach(f => (sheet[f.key] = ''));
  return { id: 0, userId: 0, owner: '', botanicalName: '', nickname: '', acquiredAt: '', public: false, sheet };
}

export function errMsg(e: any): string {
  return e?.error?.error ?? 'Qualcosa è andato storto, riprova.';
}

export interface Entry { id: number; plantId: number; date: string; kind: string; note: string; hasPhoto: boolean; }

export const KINDS: { v: string; l: string; icon: string }[] = [
  { v: 'nota', l: 'Nota', icon: '✎' },
  { v: 'radice', l: 'Nuova radice', icon: '🌱' },
  { v: 'foglia', l: 'Nuova foglia', icon: '🍃' },
  { v: 'spiga', l: 'Spiga fiorale', icon: '🌾' },
  { v: 'fioritura', l: 'Fioritura', icon: '🌸' },
  { v: 'rinvaso', l: 'Rinvaso', icon: '🪴' },
  { v: 'trattamento', l: 'Trattamento', icon: '💧' },
];
