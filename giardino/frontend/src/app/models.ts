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

// Etichette e suggerimenti stanno in traduzioni.csv: chiavi field.<key>.label e field.<key>.hint
export interface FieldDef { key: string; long?: boolean; hint?: boolean; }

export const SHEET_FIELDS: FieldDef[] = [
  { key: 'origine', long: true, hint: true },
  { key: 'crescita', hint: true },
  { key: 'luce', hint: true },
  { key: 'temperatura', long: true, hint: true },
  { key: 'umidita', hint: true },
  { key: 'ventilazione', hint: true },
  { key: 'substrato', hint: true },
  { key: 'annaffiatura', long: true, hint: true },
  { key: 'acqua', hint: true },
  { key: 'fertilizzazione', hint: true },
  { key: 'riposo', hint: true },
  { key: 'fioritura', hint: true },
  { key: 'note', long: true },
];

export function emptyPlant(): Plant {
  const sheet: Sheet = {};
  SHEET_FIELDS.forEach(f => (sheet[f.key] = ''));
  return { id: 0, userId: 0, owner: '', botanicalName: '', nickname: '', acquiredAt: '', public: false, sheet };
}

// Restituisce la chiave di traduzione dell'errore (il server manda un codice stabile).
export function errKey(e: any): string {
  const code = e?.error?.error;
  return typeof code === 'string' ? 'err.' + code : 'err.generic';
}

export interface Entry { id: number; plantId: number; date: string; kind: string; note: string; hasPhoto: boolean; }

// L'etichetta di ogni tipo è la chiave kind.<v>
export const KINDS: { v: string; icon: string }[] = [
  { v: 'nota', icon: '✎' },
  { v: 'radice', icon: '🌱' },
  { v: 'foglia', icon: '🍃' },
  { v: 'germoglio', icon: '🌿' },
  { v: 'fioritura', icon: '🌸' },
  { v: 'rinvaso', icon: '🪴' },
  { v: 'trattamento', icon: '💧' },
];
