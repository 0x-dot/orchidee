import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../auth';
import { errMsg } from '../models';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <section class="paper box">
      <h1>{{ mode() === 'login' ? 'Bentornato in serra' : 'Apri il tuo giardino' }}</h1>
      <p class="lead">Un piccolo giardino digitale per le tue orchidee: schede di allevamento, storico di crescita e condivisione.</p>
      <div class="divider"></div>
      <form (ngSubmit)="submit()">
        <label class="f">Nome utente
          <input name="u" [(ngModel)]="username" autocomplete="username" required>
        </label>
        <label class="f">Password
          <input name="p" type="password" [(ngModel)]="password" required
                 [attr.autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'">
        </label>
        @if (error()) { <p class="error">{{ error() }}</p> }
        <div class="row between">
          <button class="btn" [disabled]="busy()">{{ mode() === 'login' ? 'Entra' : 'Crea account' }}</button>
          <button type="button" class="btn ghost" (click)="toggle()">
            {{ mode() === 'login' ? 'Non hai un account?' : 'Ho già un account' }}
          </button>
        </div>
      </form>
    </section>`,
  styles: `.box { max-width: 460px; margin: 2rem auto; }`,
})
export class Login {
  private auth = inject(Auth);
  private router = inject(Router);
  mode = signal<'login' | 'register'>('login');
  error = signal('');
  busy = signal(false);
  username = '';
  password = '';

  toggle() { this.mode.update(m => (m === 'login' ? 'register' : 'login')); this.error.set(''); }

  async submit() {
    this.busy.set(true); this.error.set('');
    try {
      if (this.mode() === 'login') await this.auth.login(this.username, this.password);
      else await this.auth.register(this.username, this.password);
      this.router.navigate(['/']);
    } catch (e) { this.error.set(errMsg(e)); }
    this.busy.set(false);
  }
}
