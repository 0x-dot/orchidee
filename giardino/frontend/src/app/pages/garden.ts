import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../auth';
import { I18n, TPipe } from '../i18n';
import { Plant } from '../models';
import { PlantsApi } from '../plants-api';
import { PlantCard } from '../shared/plant-card';

@Component({
  selector: 'app-garden',
  imports: [RouterLink, PlantCard, TPipe],
  template: `
    <div class="row between">
      <div>
        <h1>{{ 'garden.title' | t:{ name: auth.user()?.username ?? '' } }}</h1>
        <p class="lead">{{ 'garden.lead' | t }}</p>
      </div>
      <a class="btn" routerLink="/piante/nuova">{{ 'garden.new' | t }}</a>
    </div>
    @if (loading()) { <p class="muted">{{ 'garden.loading' | t }}</p> }
    @else if (plants().length === 0) {
      <div class="paper empty">
        <p>{{ 'garden.empty' | t }}</p>
        <p class="muted">{{ 'garden.emptyHint1' | t }} <a routerLink="/esplora">{{ 'garden.emptyHintLink' | t }}</a> {{ 'garden.emptyHint2' | t }}</p>
        <button class="btn ghost" (click)="seed()" [disabled]="seeding()">{{ 'garden.seed' | t }}</button>
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
  private i18n = inject(I18n);
  plants = signal<Plant[]>([]);
  loading = signal(true);
  seeding = signal(false);
  constructor() { this.reload(); }
  private reload() { return this.api.mine().then(p => { this.plants.set(p); this.loading.set(false); }); }
  async seed() {
    this.seeding.set(true);
    try { await this.api.seed(this.i18n.lang()); await this.reload(); } finally { this.seeding.set(false); }
  }
}
