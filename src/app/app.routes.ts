import { Routes } from '@angular/router';

const dashboardPage = () =>
  import('./features/dashboard/dashboard-page/dashboard-page').then(
    (module) => module.DashboardPage,
  );

const calendarPage = () =>
  import('./features/calendar/calendar-page/calendar-page').then((module) => module.CalendarPage);

const sectionPage = () =>
  import('./features/section/section-page').then((module) => module.SectionPage);

const tasksPage = () =>
  import('./features/tasks/tasks-page/tasks-page').then((module) => module.TasksPage);

const teamPage = () =>
  import('./features/team/team-page/team-page').then((module) => module.TeamPage);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadComponent: dashboardPage },
  { path: 'tasks', loadComponent: tasksPage },
  { path: 'calendar', loadComponent: calendarPage },
  { path: 'analytics', loadComponent: sectionPage },
  { path: 'team', loadComponent: teamPage },
  { path: 'settings', loadComponent: sectionPage },
];
