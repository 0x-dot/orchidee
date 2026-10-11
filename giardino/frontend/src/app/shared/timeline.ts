import { Component, ElementRef, effect, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Entry, errMsg, KINDS } from '../models';
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
  imports: [FormsModule],
  template: `
    <section class="tl">
      <h2 class="title">Storico di crescita</h2>

      @if (editable()) {
        <details class="paper add noprint" [open]="entries().length === 0">
          <summary>+ Aggiungi una voce</summary>
          <form (ngSubmit)="add()">
            <div class="two">
              <label class="f">Data <input name="d" type="date" [(ngModel)]="date" required></label>
              <label class="f">Cosa è successo
                <select name="k" [(ngModel)]="kind">
                  @for (k of kinds; track k.v) { <option [value]="k.v">{{ k.icon }} {{ k.l }}</option> }
                </select>
              </label>
            </div>
            <label class="f">Nota <textarea name="n" rows="2" [(ngModel)]="note" maxlength="2000" placeholder="Es: due nuove radici verdi, spuntata la terza foglia…"></textarea></label>
            <label class="f">Foto <input #file type="file" accept="image/*" (change)="pick($event)"></label>
            @if (preview()) { <img class="prev" [src]="preview()" alt="anteprima"> }
            @if (error()) { <p class="error">{{ error() }}</p> }
            <button class="btn" [disabled]="busy()">{{ busy() ? 'Salvo…' : 'Aggiungi allo storico' }}</button>
          </form>
        </details>
      }

      @if (entries().length === 0) {
        <p class="muted">Ancora nessuna voce nello storico.</p>
      } @else {
        <ol class="film">
          @for (e of entries(); track e.id) {
            <li>
              <div class="plate paper">
                <div class="row between">
                  <span class="catno">{{ fmt(e.date) }}</span>
                  <span class="badge">{{ icon(e.kind) }} {{ label(e.kind) }}</span>
                </div>
                @if (e.hasPhoto) {
                  <a [href]="'/api/timeline/' + e.id + '/photo'" target="_blank" rel="noopener">
                    <img [src]="'/api/timeline/' + e.id + '/photo'" loading="lazy" [alt]="label(e.kind) + ' del ' + fmt(e.date)">
                  </a>
                }
                @if (e.note) { <p class="note">{{ e.note }}</p> }
                @if (editable()) { <button class="btn danger small noprint" (click)="remove(e)">Elimina</button> }
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

  fmt(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); }
  label(k: string) { return KINDS.find(x => x.v === k)?.l ?? k; }
  icon(k: string) { return KINDS.find(x => x.v === k)?.icon ?? '✎'; }

  async pick(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    this.photo = null; this.preview.set(''); this.error.set('');
    if (!f) return;
    try {
      this.photo = await shrink(f);
      this.preview.set(URL.createObjectURL(this.photo));
    } catch { this.error.set('Impossibile leggere questa immagine (HEIC non è supportato: usa JPG, PNG o WebP).'); }
  }

  async add() {
    if (!this.note.trim() && !this.photo) { this.error.set('Aggiungi una nota o una foto.'); return; }
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
    } catch (e) { this.error.set(errMsg(e)); }
    this.busy.set(false);
  }

  async remove(e: Entry) {
    if (!confirm('Eliminare questa voce dallo storico?')) return;
    try { await this.api.removeEntry(e.id); this.entries.update(l => l.filter(x => x.id !== e.id)); }
    catch (err) { this.error.set(errMsg(err)); }
  }
}
