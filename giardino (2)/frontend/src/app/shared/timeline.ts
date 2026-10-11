import { Component, ElementRef, effect, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18n, TPipe } from '../i18n';
import { Entry, errKey, KINDS } from '../models';
import { PlantsApi } from '../plants-api';

// Ridimensiona nel browser: createImageBitmap rispetta l'orientamento EXIF, così le foto da telefono non escono ruotate.
async function shrink(file: File, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej()), 'image/jpeg', 0.85));
}

const today = () => new Date().toISOString().slice(0, 10);

@Component({
  selector: 'app-timeline',
  imports: [FormsModule, TPipe],
  template: `
    <section class="tl">
      <h2 class="title">{{ 'timeline.title' | t }}</h2>

      @if (editable()) {
        <details class="paper add noprint" [open]="entries().length === 0">
          <summary>{{ 'timeline.add' | t }}</summary>
          <form (ngSubmit)="add()">
            <div class="two">
              <label class="f">{{ 'timeline.date' | t }} <input name="d" type="date" [(ngModel)]="date" required></label>
              <label class="f">{{ 'timeline.kind' | t }}
                <select name="k" [(ngModel)]="kind">
                  @for (k of kinds; track k.v) { <option [value]="k.v">{{ k.icon }} {{ 'kind.' + k.v | t }}</option> }
                </select>
              </label>
            </div>
            <label class="f">{{ 'timeline.note' | t }} <textarea name="n" rows="2" [(ngModel)]="note" maxlength="2000" [placeholder]="'timeline.notePh' | t"></textarea></label>
            <label class="f">{{ 'timeline.photo' | t }} <input #file type="file" accept="image/*" (change)="pick($event)"></label>
            @if (preview()) { <img class="prev" [src]="preview()" [alt]="'timeline.preview' | t"> }
            @if (error()) { <p class="error">{{ error() | t }}</p> }
            <button class="btn" [disabled]="busy()">{{ (busy() ? 'timeline.saving' : 'timeline.submit') | t }}</button>
          </form>
        </details>
      }

      @if (entries().length === 0) {
        <p class="muted">{{ 'timeline.empty' | t }}</p>
      } @else {
        <ol class="film">
          @for (e of entries(); track e.id) {
            <li>
              <div class="plate paper">
                <div class="row between">
                  <span class="catno">{{ fmt(e.date) }}</span>
                  <span class="badge">{{ icon(e.kind) }} {{ 'kind.' + e.kind | t }}</span>
                </div>
                @if (e.hasPhoto) {
                  <a [href]="'/api/timeline/' + e.id + '/photo'" target="_blank" rel="noopener">
                    <img [src]="'/api/timeline/' + e.id + '/photo'" loading="lazy" [alt]="('kind.' + e.kind | t) + ' · ' + fmt(e.date)">
                  </a>
                }
                @if (e.note) { <p class="note">{{ e.note }}</p> }
                @if (editable()) { <button class="btn danger small noprint" (click)="remove(e)">{{ 'detail.delete' | t }}</button> }
              </div>
            </li>
          }
        </ol>
      }
    </section>`,
  styles: `
    .tl { margin-top: 2.2rem; }
    .title { font-size: 1.3rem; font-style: italic; border-bottom: 1px solid var(--seppia); padding-bottom: .2rem; margin-bottom: 1rem; }
    .add { margin-bottom: 1.4rem; }
    summary { cursor: pointer; font-style: italic; color: var(--sage-dark); }
    .two { display:grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
    @media (max-width:560px) { .two { grid-template-columns: 1fr; } }
    .prev { max-width: 220px; max-height: 160px; border: 1.5px solid var(--seppia); padding: 4px; background: #fff; display:block; margin-bottom:.6rem; }
    .film { list-style: none; margin: 0; padding: 0 0 0 1.6rem; border-left: 2px dotted var(--seppia); }
    .film li { position: relative; margin-bottom: 1.2rem; }
    .film li::before { content:''; position:absolute; left:-2.02rem; top:1.1rem; width:.8rem; height:.8rem; border-radius:50%;
      background: var(--gold); border: 2px solid var(--seppia-dark); }
    .plate { padding: .9rem 1.1rem; }
    .badge { font-size: .85rem; color: var(--sage-dark); }
    img { display:block; max-width:100%; max-height: 380px; margin: .6rem auto; border: 1.5px solid var(--seppia); padding: 5px; background:#fff; }
    .note { margin: .4rem 0; white-space: pre-line; }
  `,
})
export class Timeline {
  plantId = input.required<number>();
  editable = input(false);
  private api = inject(PlantsApi);
  private i18n = inject(I18n);
  private fileInput = viewChild<ElementRef<HTMLInputElement>>('file');

  entries = signal<Entry[]>([]);
  error = signal('');
  busy = signal(false);
  preview = signal('');
  kinds = KINDS;
  date = today();
  kind = 'nota';
  note = '';
  private photo: Blob | null = null;

  constructor() {
    effect(() => {
      const id = this.plantId();
      this.api.timeline(id).then(e => this.entries.set(e)).catch(() => this.entries.set([]));
    });
  }

  fmt(d: string) { return this.i18n.date(d); }
  icon(k: string) { return KINDS.find(x => x.v === k)?.icon ?? '✎'; }

  async pick(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    this.photo = null; this.preview.set(''); this.error.set('');
    if (!f) return;
    try {
      this.photo = await shrink(f);
      this.preview.set(URL.createObjectURL(this.photo));
    } catch { this.error.set('timeline.unreadable'); }
  }

  async add() {
    if (!this.note.trim() && !this.photo) { this.error.set('timeline.needContent'); return; }
    const fd = new FormData();
    fd.append('date', this.date);
    fd.append('kind', this.kind);
    fd.append('note', this.note);
    if (this.photo) fd.append('photo', this.photo, 'foto.jpg');
    this.busy.set(true); this.error.set('');
    try {
      await this.api.addEntry(this.plantId(), fd);
      this.entries.set(await this.api.timeline(this.plantId()));
      this.note = ''; this.kind = 'nota'; this.date = today(); this.photo = null; this.preview.set('');
      const el = this.fileInput()?.nativeElement; if (el) el.value = '';
    } catch (e) { this.error.set(errKey(e)); }
    this.busy.set(false);
  }

  async remove(e: Entry) {
    if (!confirm(this.i18n.t('timeline.confirmDelete'))) return;
    try { await this.api.removeEntry(e.id); this.entries.update(l => l.filter(x => x.id !== e.id)); }
    catch (err) { this.error.set(errKey(err)); }
  }
}
