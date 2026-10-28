import { Routes } from '@angular/router';

import { DashboardPage } from './features/dashboard/dashboard-page';

const sectionPage = () =>
  import('./features/section/section-page').then((module) => module.SectionPage);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tasks' },
  { path: 'dashboard', component: DashboardPage },
  { path: 'tasks', loadComponent: sectionPage },
  { path: 'calendar', loadComponent: sectionPage },
  { path: 'analytics', loadComponent: sectionPage },
  { path: 'team', loadComponent: sectionPage },
  { path: 'settings', loadComponent: sectionPage },
];
