import { Routes } from '@angular/router';

const sectionPage = () =>
  import('./features/section/section-page').then((module) => module.SectionPage);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tasks' },
  { path: 'dashboard', loadComponent: sectionPage },
  { path: 'tasks', loadComponent: sectionPage },
  { path: 'calendar', loadComponent: sectionPage },
  { path: 'analytics', loadComponent: sectionPage },
  { path: 'team', loadComponent: sectionPage },
  { path: 'settings', loadComponent: sectionPage },
];
