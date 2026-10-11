import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../auth';
import { Plant } from '../models';
import { PlantsApi } from '../plants-api';
import { PlantCard } from '../shared/plant-card';

@Component({
  selector: 'app-garden',
  imports: [RouterLink, PlantCard],
  template: `
    <div class="row between">
      <div>
        <h1>Il giardino di {{ auth.user()?.username }}</h1>
        <p class="lead">Le tue piante, con le loro schede di allevamento.</p>
      </div>
      <a class="btn" routerLink="/piante/nuova">+ Nuova pianta</a>
    </div>
    @if (loading()) { <p class="muted">Sto annaffiando…</p> }
    @else if (plants().length === 0) {
      <div class="paper empty">
        <p>Il giardino è ancora vuoto.</p>
        <p class="muted">Aggiungi la tua prima orchidea, oppure <a routerLink="/esplora">esplora le schede degli altri</a> e copiane una.</p>
        <button class="btn ghost" (click)="seed()" [disabled]="seeding()">🌿 Aggiungi le 3 orchidee iniziali</button>
      </div>
    } @else {
      <div class="grid">
        @for (p of plants(); track p.id) { <app-plant-card [plant]="p" /> }
      </div>
    }`,
  styles: `.empty { margin-top: 1.5rem; text-align: center; }`,
})
export class Garden {
  auth = inject(Auth);
  private api = inject(PlantsApi);
  plants = signal<Plant[]>([]);
  loading = signal(true);
  seeding = signal(false);
  constructor() { this.reload(); }
  private reload() { return this.api.mine().then(p => { this.plants.set(p); this.loading.set(false); }); }
  async seed() {
    this.seeding.set(true);
    try { await this.api.seed(); await this.reload(); } finally { this.seeding.set(false); }
  }
}
