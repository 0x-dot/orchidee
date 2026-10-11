import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { emptyPlant, errMsg, Plant, SHEET_FIELDS } from '../models';
import { PlantsApi } from '../plants-api';

@Component({
  selector: 'app-plant-form',
  imports: [FormsModule, RouterLink],
  template: `
    <h1>{{ isNew() ? 'Nuova pianta' : 'Modifica scheda' }}</h1>
    @if (plant(); as p) {
      <form class="paper" (ngSubmit)="save()">
        <label class="f">Nome botanico *
          <input name="bot" [(ngModel)]="p.botanicalName" placeholder="Es: Aerangis mystacidii" required maxlength="120">
        </label>
        <div class="two">
          <label class="f">Il nome della tua pianta
            <input name="nick" [(ngModel)]="p.nickname" placeholder="Es: patate fiorite" maxlength="120">
          </label>
          <label class="f">Nel giardino dal
            <input name="acq" type="date" [(ngModel)]="p.acquiredAt">
          </label>
        </div>
        <div class="divider"></div>

        @for (f of fields; track f.key) {
          <label class="f">{{ f.label }}
            @if (f.long) {
              <textarea [name]="f.key" rows="3" [(ngModel)]="p.sheet[f.key]" [placeholder]="f.hint ?? ''" maxlength="2000"></textarea>
            } @else {
              <input [name]="f.key" [(ngModel)]="p.sheet[f.key]" [placeholder]="f.hint ?? ''" maxlength="2000">
            }
          </label>
        }

        <label class="check">
          <input type="checkbox" name="pub" [(ngModel)]="p.public">
          Rendi pubblica questa scheda (gli altri potranno vederla e copiarla; nome personale e storico restano tuoi)
        </label>

        @if (error()) { <p class="error">{{ error() }}</p> }
        <div class="row">
          <button class="btn" [disabled]="busy()">Salva</button>
          <a class="btn ghost" [routerLink]="isNew() ? '/' : ['/piante', p.id]">Annulla</a>
        </div>
      </form>
    }`,
  styles: `.two { display:grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; } @media (max-width:560px){ .two{grid-template-columns:1fr;} }`,
})
export class PlantForm {
  id = input<string>(); // assente = nuova pianta
  private api = inject(PlantsApi);
  private router = inject(Router);
  fields = SHEET_FIELDS;
  plant = signal<Plant | null>(null);
  error = signal('');
  busy = signal(false);

  constructor() {
    effect(() => {
      const id = this.id();
      if (!id) { this.plant.set(emptyPlant()); return; }
      this.api.get(id).then(p => {
        SHEET_FIELDS.forEach(f => (p.sheet[f.key] ??= ''));
        this.plant.set(p);
      }).catch(e => this.error.set(errMsg(e)));
    });
  }

  isNew() { return !this.id(); }

  async save() {
    const p = this.plant();
    if (!p) return;
    this.busy.set(true); this.error.set('');
    try {
      const saved = this.isNew() ? await this.api.create(p) : await this.api.update(p);
      this.router.navigate(['/piante', saved.id]);
    } catch (e) { this.error.set(errMsg(e)); }
    this.busy.set(false);
  }
}
