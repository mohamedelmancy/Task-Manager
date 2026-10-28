export type NavIconName = 'dashboard' | 'tasks' | 'calendar' | 'analytics' | 'team' | 'settings';

export interface NavItem {
  path: string;
  labelKey: string;
  icon: NavIconName;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: 'dashboard' },
  { path: '/tasks', labelKey: 'nav.tasks', icon: 'tasks' },
  { path: '/calendar', labelKey: 'nav.calendar', icon: 'calendar' },
  { path: '/analytics', labelKey: 'nav.analytics', icon: 'analytics' },
  { path: '/team', labelKey: 'nav.team', icon: 'team' },
  { path: '/settings', labelKey: 'nav.settings', icon: 'settings' },
];
