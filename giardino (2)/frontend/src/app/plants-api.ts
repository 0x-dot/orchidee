import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Entry, Plant } from './models';

@Injectable({ providedIn: 'root' })
export class PlantsApi {
  private http = inject(HttpClient);
  mine() { return firstValueFrom(this.http.get<Plant[]>('/api/plants')); }
  explore() { return firstValueFrom(this.http.get<Plant[]>('/api/explore')); }
  get(id: number | string) { return firstValueFrom(this.http.get<Plant>(`/api/plants/${id}`)); }
  create(p: Plant) { return firstValueFrom(this.http.post<Plant>('/api/plants', p)); }
  update(p: Plant) { return firstValueFrom(this.http.put<Plant>(`/api/plants/${p.id}`, p)); }
  remove(id: number) { return firstValueFrom(this.http.delete<void>(`/api/plants/${id}`)); }
  copy(id: number) { return firstValueFrom(this.http.post<Plant>(`/api/plants/${id}/copy`, {})); }
  seed(lang: string) { return firstValueFrom(this.http.post<{ added: number }>('/api/seed?lang=' + lang, {})); }
  timeline(plantId: number) { return firstValueFrom(this.http.get<Entry[]>(`/api/plants/${plantId}/timeline`)); }
  addEntry(plantId: number, form: FormData) { return firstValueFrom(this.http.post<Entry>(`/api/plants/${plantId}/timeline`, form)); }
  removeEntry(id: number) { return firstValueFrom(this.http.delete<void>(`/api/timeline/${id}`)); }
}
