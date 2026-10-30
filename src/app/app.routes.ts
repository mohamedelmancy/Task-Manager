import { Routes } from '@angular/router';

const dashboardPage = () =>
  import('./features/dashboard/dashboard-page/dashboard-page').then(
    (module) => module.DashboardPage,
  );

const sectionPage = () =>
  import('./features/section/section-page').then((module) => module.SectionPage);

const tasksPage = () =>
  import('./features/tasks/tasks-page/tasks-page').then((module) => module.TasksPage);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tasks' },
  { path: 'dashboard', loadComponent: dashboardPage },
  { path: 'tasks', loadComponent: tasksPage },
  { path: 'calendar', loadComponent: sectionPage },
  { path: 'analytics', loadComponent: sectionPage },
  { path: 'team', loadComponent: sectionPage },
  { path: 'settings', loadComponent: sectionPage },
];
