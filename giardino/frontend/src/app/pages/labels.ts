import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n, TPipe } from '../i18n';
import { errKey, Plant } from '../models';
import { PlantsApi } from '../plants-api';

@Component({
  selector: 'app-labels',
  imports: [RouterLink, TPipe],
  template: `
    <h1>{{ 'labels.title' | t }}</h1>
    <p class="lead">{{ 'labels.lead' | t }}</p>

    @if (loading()) { <p class="muted">{{ 'labels.loading' | t }}</p> }
    @else if (plants().length === 0) {
      <p class="paper">{{ 'labels.none' | t }} <a routerLink="/piante/nuova">{{ 'labels.addOne' | t }}</a>.</p>
    } @else {
      <div class="paper">
        <div class="row between">
          <button class="btn ghost small" (click)="toggleAll()">{{ (allSelected() ? 'labels.deselectAll' : 'labels.selectAll') | t }}</button>
          <span class="muted">{{ 'labels.count' | t:{ n: selected().size, total: plants().length } }}</span>
        </div>
        <ul>
          @for (p of plants(); track p.id) {
            <li>
              <label class="check">
                <input type="checkbox" [checked]="selected().has(p.id)" (change)="toggle(p.id)">
                <span><i>{{ p.botanicalName }}</i>@if (p.nickname) { · «{{ p.nickname }}» }</span>
                @if (!p.public) { <span class="priv" [attr.title]="'labels.privateTip' | t">🔒</span> }
              </label>
            </li>
          }
        </ul>
        <p class="muted small">{{ 'labels.privateNote' | t }}</p>
        @if (error()) { <p class="error">{{ error() | t }}</p> }
        <button class="btn" [disabled]="busy() || selected().size === 0" (click)="download()">
          {{ (busy() ? 'labels.preparing' : 'labels.download') | t }}
        </button>
      </div>
    }`,
  styles: `
    ul { list-style: none; padding: 0; margin: .8rem 0; }
    li { padding: .15rem 0; border-bottom: 1px dotted var(--ring); }
    .check { margin: .3rem 0; cursor: pointer; }
    .small { font-size: .85rem; }
  `,
})
export class Labels {
  private api = inject(PlantsApi);
  private i18n = inject(I18n);
  plants = signal<Plant[]>([]);
  selected = signal<Set<number>>(new Set());
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  allSelected = computed(() => this.plants().length > 0 && this.selected().size === this.plants().length);

  constructor() {
    this.api.mine().then(p => { this.plants.set(p); this.selected.set(new Set(p.map(x => x.id))); this.loading.set(false); });
  }

  toggle(id: number) {
    this.selected.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  toggleAll() {
    this.selected.set(this.allSelected() ? new Set() : new Set(this.plants().map(p => p.id)));
  }

  async download() {
    this.busy.set(true); this.error.set('');
    try {
      const { buildLabelsPdf } = await import('../labels-pdf'); // jsPDF e qrcode caricati solo qui
      const chosen = this.plants().filter(p => this.selected().has(p.id));
      const t = (k: string) => this.i18n.t(k);
      const blob = await buildLabelsPdf(chosen, location.origin, {
        name: t('pdf.name'), light: t('pdf.light'), humidity: t('pdf.humidity'), water: t('pdf.water'), notes: t('pdf.notes'),
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = t('labels.filename');
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { this.error.set(errKey(e)); }
    this.busy.set(false);
  }
}
