import { Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../auth';
import { errMsg, Plant, SHEET_FIELDS } from '../models';
import { PlantsApi } from '../plants-api';
import { Timeline } from '../shared/timeline';

@Component({
  selector: 'app-plant-detail',
  imports: [RouterLink, Timeline],
  template: `
    @if (error()) { <p class="error">{{ error() }}</p> }
    @if (plant(); as p) {
      <article class="paper">
        <div class="row between">
          <span class="catno">N° {{ pad(p.id) }} · {{ p.public ? 'scheda pubblica' : 'scheda privata' }}</span>
          <span class="muted">di {{ p.owner }}</span>
        </div>
        <h1 class="latin">{{ p.botanicalName }}</h1>
        <div class="divider"></div>
        @if (p.nickname) { <p class="nick">«{{ p.nickname }}»</p> }
        @if (p.acquiredAt) { <p class="muted">Nel giardino dal {{ p.acquiredAt }}</p> }

        @for (f of fields; track f.key) {
          @if (p.sheet[f.key]) {
            <section>
              <h2>{{ f.label }}</h2>
              <p class="val">{{ p.sheet[f.key] }}</p>
            </section>
          }
        }
      </article>

      <app-timeline [plantId]="p.id" [editable]="isOwner()" />

      <div class="row actions noprint">
        <a class="btn ghost" routerLink="/esplora">⬅ Torna all'elenco</a>
        <button class="btn ghost" (click)="print()">🖨 Stampa scheda</button>
        @if (isOwner()) {
          <a class="btn" [routerLink]="['/piante', p.id, 'modifica']">Modifica</a>
          <button class="btn danger" (click)="remove(p)">Elimina</button>
        } @else if (auth.user()) {
          <button class="btn" (click)="copy(p)">Copia nel mio giardino</button>
        } @else {
          <a class="btn" routerLink="/accedi">Accedi per copiarla</a>
        }
      </div>
    }`,
  styles: `
    section { margin-top: 1rem; }
    h2 { font-size: .95rem; letter-spacing: .1em; text-transform: uppercase; color: var(--seppia-dark); border-bottom: 1px dotted var(--seppia); padding-bottom: .15rem; }
    .val { white-space: pre-line; margin: .3rem 0 0; }
    .nick { font-size: 1.15rem; font-weight: bold; font-style: italic; margin: .3rem 0; }
    .actions { margin-top: 1.2rem; }
  `,
})
export class PlantDetail {
  id = input.required<string>();
  auth = inject(Auth);
  private api = inject(PlantsApi);
  private router = inject(Router);
  fields = SHEET_FIELDS;
  plant = signal<Plant | null>(null);
  error = signal('');

  constructor() {
    effect(() => {
      const id = this.id();
      this.plant.set(null); this.error.set('');
      this.api.get(id).then(p => this.plant.set(p)).catch(e => this.error.set(errMsg(e)));
    });
  }

  pad(n: number) { return String(n).padStart(4, '0'); }
  isOwner() { return this.auth.user()?.id === this.plant()?.userId; }
  print() { window.print(); }

  async copy(p: Plant) {
    try { const c = await this.api.copy(p.id); this.router.navigate(['/piante', c.id, 'modifica']); }
    catch (e) { this.error.set(errMsg(e)); }
  }

  async remove(p: Plant) {
    if (!confirm(`Eliminare «${p.botanicalName}» dal tuo giardino?`)) return;
    try { await this.api.remove(p.id); this.router.navigate(['/']); }
    catch (e) { this.error.set(errMsg(e)); }
  }
}
