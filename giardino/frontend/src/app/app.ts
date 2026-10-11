import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from './auth';
import { I18n, TPipe } from './i18n';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  auth = inject(Auth);
  i18n = inject(I18n);
  private router = inject(Router);
  constructor() { this.auth.load(); }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/esplora']);
  }
}
