import { Component, inject, signal } from '@angular/core';
import { TPipe } from '../i18n';
import { Plant } from '../models';
import { PlantsApi } from '../plants-api';
import { PlantCard } from '../shared/plant-card';

@Component({
  selector: 'app-explore',
  imports: [PlantCard, TPipe],
  template: `
    <h1>{{ 'explore.title' | t }}</h1>
    <p class="lead">{{ 'explore.lead' | t }}</p>
    @if (loading()) { <p class="muted">{{ 'explore.loading' | t }}</p> }
    @else if (plants().length === 0) { <p class="muted">{{ 'explore.empty' | t }}</p> }
    @else {
      <div class="grid">
        @for (p of plants(); track p.id) { <app-plant-card [plant]="p" [showOwner]="true" /> }
      </div>
    }`,
})
export class Explore {
  private api = inject(PlantsApi);
  plants = signal<Plant[]>([]);
  loading = signal(true);
  constructor() { this.api.explore().then(p => { this.plants.set(p); this.loading.set(false); }); }
}
