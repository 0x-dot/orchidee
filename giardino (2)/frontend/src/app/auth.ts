import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  readonly user = signal<User | null>(null);
  private loaded = false;

  async load() {
    if (this.loaded) return;
    try { this.user.set(await firstValueFrom(this.http.get<User>('/api/me'))); }
    catch { this.user.set(null); }
    this.loaded = true;
  }

  async login(username: string, password: string) {
    this.user.set(await firstValueFrom(this.http.post<User>('/api/login', { username, password })));
  }

  async register(username: string, password: string) {
    this.user.set(await firstValueFrom(this.http.post<User>('/api/register', { username, password })));
  }

  async logout() {
    await firstValueFrom(this.http.post('/api/logout', {}));
    this.user.set(null);
  }
}
