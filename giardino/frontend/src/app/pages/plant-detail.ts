import { Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../auth';
import { I18n, TPipe } from '../i18n';
import { errKey, Plant, SHEET_FIELDS } from '../models';
import { PlantsApi } from '../plants-api';
import { Timeline } from '../shared/timeline';

@Component({
  selector: 'app-plant-detail',
  imports: [RouterLink, Timeline, TPipe],
  template: `
    @if (error()) { <p class="error">{{ error() | t }}</p> }
    @if (plant(); as p) {
      <article class="paper">
        <div class="row between">
          <span class="catno">{{ 'card.no' | t:{ n: pad(p.id) } }} · {{ (p.public ? 'detail.public' : 'detail.private') | t }}</span>
          <span class="muted">{{ 'detail.by' | t:{ owner: p.owner } }}</span>
        </div>
        <h1 class="latin">{{ p.botanicalName }}</h1>
        <div class="divider"></div>
        @if (p.nickname) { <p class="nick">«{{ p.nickname }}»</p> }
        @if (p.acquiredAt) { <p class="muted">{{ 'detail.since' | t:{ date: i18n.date(p.acquiredAt) } }}</p> }

        @for (f of fields; track f.key) {
          @if (p.sheet[f.key]) {
            <section>
              <h2>{{ 'field.' + f.key + '.label' | t }}</h2>
              <p class="val">{{ p.sheet[f.key] }}</p>
            </section>
          }
        }
      </article>

      <app-timeline [plantId]="p.id" [editable]="isOwner()" />

      <div class="row actions noprint">
        <a class="btn ghost" routerLink="/esplora">{{ 'detail.back' | t }}</a>
        <button class="btn ghost" (click)="print()">{{ 'detail.print' | t }}</button>
        @if (isOwner()) {
          <a class="btn" [routerLink]="['/piante', p.id, 'modifica']">{{ 'detail.edit' | t }}</a>
          <button class="btn danger" (click)="remove(p)">{{ 'detail.delete' | t }}</button>
        } @else if (auth.user()) {
          <button class="btn" (click)="copy(p)">{{ 'detail.copy' | t }}</button>
        } @else {
          <a class="btn" routerLink="/accedi">{{ 'detail.loginToCopy' | t }}</a>
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
  i18n = inject(I18n);
  private api = inject(PlantsApi);
  private router = inject(Router);
  fields = SHEET_FIELDS;
  plant = signal<Plant | null>(null);
  error = signal('');

  constructor() {
    effect(() => {
      const id = this.id();
      this.plant.set(null); this.error.set('');
      this.api.get(id).then(p => this.plant.set(p)).catch(e => this.error.set(errKey(e)));
    });
  }

  pad(n: number) { return String(n).padStart(4, '0'); }
  isOwner() { return this.auth.user()?.id === this.plant()?.userId; }
  print() { window.print(); }

  async copy(p: Plant) {
    try { const c = await this.api.copy(p.id); this.router.navigate(['/piante', c.id, 'modifica']); }
    catch (e) { this.error.set(errKey(e)); }
  }

  async remove(p: Plant) {
    if (!confirm(this.i18n.t('detail.confirmDelete', { name: p.botanicalName }))) return;
    try { await this.api.remove(p.id); this.router.navigate(['/']); }
    catch (e) { this.error.set(errKey(e)); }
  }
}
