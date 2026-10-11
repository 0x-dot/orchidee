import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';
import { TRANSLATIONS } from './i18n.generated';

export type Lang = 'it' | 'en';
type Params = Record<string, string | number>;
const STORAGE_KEY = 'giardino.lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'it' || saved === 'en') return saved;
  } catch { /* storage non disponibile */ }
  return navigator.language?.toLowerCase().startsWith('it') ? 'it' : 'en';
}

@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>(initialLang());
  constructor() { this.apply(); }

  set(l: Lang) {
    this.lang.set(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignora */ }
    this.apply();
  }

  get locale() { return this.lang() === 'it' ? 'it-IT' : 'en-GB'; }

  t(key: string, params?: Params): string {
    const dict = TRANSLATIONS[this.lang()];
    let s = dict[key] ?? (key.startsWith('err.') ? dict['err.generic'] : undefined) ?? key;
    if (params) s = s.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''));
    return s;
  }

  date(iso: string, style: 'long' | 'medium' = 'long') {
    return new Date(iso + 'T12:00:00').toLocaleDateString(this.locale, { dateStyle: style });
  }

  private apply() {
    document.documentElement.lang = this.lang();
    document.title = this.t('app.title');
  }
}

// Pipe "impura" perché deve aggiornarsi quando cambia la lingua.
@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  private i18n = inject(I18n);
  transform(key: string, params?: Params): string { return this.i18n.t(key, params); }
}
