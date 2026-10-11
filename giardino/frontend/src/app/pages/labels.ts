import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errMsg, Plant } from '../models';
import { PlantsApi } from '../plants-api';

@Component({
  selector: 'app-labels',
  imports: [RouterLink],
  template: `
    <h1>Etichette da stampare</h1>
    <p class="lead">Scegli le piante: ottieni un PDF A4 con 10 etichette per foglio (90×50 mm), ognuna con un QR che porta alla scheda online.</p>

    @if (loading()) { <p class="muted">Carico il giardino…</p> }
    @else if (plants().length === 0) {
      <p class="paper">Non hai ancora piante. <a routerLink="/piante/nuova">Aggiungine una</a>.</p>
    } @else {
      <div class="paper">
        <div class="row between">
          <button class="btn ghost small" (click)="toggleAll()">{{ allSelected() ? 'Deseleziona tutte' : 'Seleziona tutte' }}</button>
          <span class="muted">{{ selected().size }} su {{ plants().length }} selezionate</span>
        </div>
        <ul>
          @for (p of plants(); track p.id) {
            <li>
              <label class="check">
                <input type="checkbox" [checked]="selected().has(p.id)" (change)="toggle(p.id)">
                <span><i>{{ p.botanicalName }}</i>@if (p.nickname) { · «{{ p.nickname }}» }</span>
                @if (!p.public) { <span class="priv" title="Scheda privata: il QR funziona solo per te">🔒</span> }
              </label>
            </li>
          }
        </ul>
        <p class="muted small">🔒 Il QR di una scheda privata funziona solo da loggato. Rendi pubblica la scheda se vuoi che chi la scansiona possa vederla.</p>
        @if (error()) { <p class="error">{{ error() }}</p> }
        <button class="btn" [disabled]="busy() || selected().size === 0" (click)="download()">
          {{ busy() ? 'Preparo il PDF…' : 'Scarica PDF' }}
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
      const blob = await buildLabelsPdf(chosen, location.origin);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'schede-orchidee.pdf';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { this.error.set(errMsg(e)); }
    this.busy.set(false);
  }
}
