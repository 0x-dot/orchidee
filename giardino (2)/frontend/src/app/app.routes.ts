import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { Auth } from './auth';

const requireLogin: CanActivateFn = async () => {
  const auth = inject(Auth);
  await auth.load();
  return auth.user() ? true : inject(Router).createUrlTree(['/accedi']);
};

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [requireLogin], loadComponent: () => import('./pages/garden').then(m => m.Garden) },
  { path: 'etichette', canActivate: [requireLogin], loadComponent: () => import('./pages/labels').then(m => m.Labels) },
  { path: 'esplora', loadComponent: () => import('./pages/explore').then(m => m.Explore) },
  { path: 'accedi', loadComponent: () => import('./pages/login').then(m => m.Login) },
  { path: 'piante/nuova', canActivate: [requireLogin], loadComponent: () => import('./pages/plant-form').then(m => m.PlantForm) },
  { path: 'piante/:id/modifica', canActivate: [requireLogin], loadComponent: () => import('./pages/plant-form').then(m => m.PlantForm) },
  { path: 'piante/:id', loadComponent: () => import('./pages/plant-detail').then(m => m.PlantDetail) },
  { path: '**', redirectTo: '' },
];
