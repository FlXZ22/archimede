export const profile = { name: 'Kate Schowalter', image: 'assets/profile.png' };

export const sections = ['Overview', 'Planner', 'Projects', 'Goals'];

export const widgets = [
  { id: 'deepWork', title: 'Deep Work Time' },
  { id: 'attention', title: 'Attention Quality' },
  { id: 'focus', title: 'Focus Stability' },
];

export const days = {
  '-1': { date: '2026-10-06', completed: 5, total: 5 },
  0: { date: '2026-10-07', completed: 2, total: 5 },
  1: { date: '2026-10-08', completed: 0, total: 4 },
};

export const priorities = {
  low: { label: 'Low Priority', icon: 'edit' },
  important: { label: 'Important', icon: 'document' },
  high: { label: 'High priority', icon: 'person' },
};

export const initialEvents = [
  { id: 'routine', title: 'Plan Weekly Routine', priority: 'low', start: 8, end: 11.58 },
  { id: 'materials', title: 'Review Project Materials', priority: 'important', start: 11.90, end: 15.72 },
  { id: 'client', title: 'Call With Client', priority: 'high', start: 15.79, end: 19.61 },
];

export const focusBars = [100, 81, 35, 73, 40, 88, 52, 70, 35, 88, 70];
export const warmBars = new Set([2, 4, 6, 8]);
