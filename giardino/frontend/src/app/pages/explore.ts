import { Component, inject, signal } from '@angular/core';
import { Plant } from '../models';
import { PlantsApi } from '../plants-api';
import { PlantCard } from '../shared/plant-card';

@Component({
  selector: 'app-explore',
  imports: [PlantCard],
  template: `
    <h1>Esplora i giardini</h1>
    <p class="lead">Le schede di allevamento che gli altri hanno scelto di condividere. Aprine una per copiarla nel tuo giardino.</p>
    @if (loading()) { <p class="muted">Sto cercando tra le aiuole…</p> }
    @else if (plants().length === 0) { <p class="muted">Nessuna scheda pubblica per ora.</p> }
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
