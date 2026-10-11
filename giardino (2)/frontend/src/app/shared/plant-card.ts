import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TPipe } from '../i18n';
import { Plant } from '../models';

@Component({
  selector: 'app-plant-card',
  imports: [RouterLink, TPipe],
  template: `
    <a class="specimen paper" [routerLink]="['/piante', plant().id]">
      <span class="catno">{{ 'card.no' | t:{ n: pad(plant().id) } }}</span>
      <h3 class="latin">{{ plant().botanicalName }}</h3>
      <div class="divider"></div>
      @if (plant().nickname) { <p class="nick">«{{ plant().nickname }}»</p> }
      @if (plant().sheet['luce']) { <p class="meta">{{ 'card.light' | t }}: {{ plant().sheet['luce'] }}</p> }
      @if (plant().sheet['umidita']) { <p class="meta">{{ 'card.humidity' | t }}: {{ plant().sheet['umidita'] }}</p> }
      <p class="foot">
        @if (showOwner()) { {{ 'card.by' | t }} <b>{{ plant().owner }}</b> } @else { {{ (plant().public ? 'card.public' : 'card.private') | t }} }
      </p>
    </a>`,
  styles: `
    .specimen { display:block; text-decoration:none; color:inherit; transition: transform .15s, box-shadow .15s; height:100%; }
    .specimen:hover { transform: translateY(-3px) rotate(-.3deg); }
    h3 { font-size: 1.2rem; margin-top:.2rem; }
    .nick { font-weight: bold; font-style: italic; margin: .2rem 0; }
    .meta { margin: 0; font-size: .88rem; color: var(--ink-soft); }
    .foot { margin: .7rem 0 0; font-size: .8rem; color: var(--seppia); }
  `,
})
export class PlantCard {
  plant = input.required<Plant>();
  showOwner = input(false);
  pad(n: number) { return String(n).padStart(4, '0'); }
}
