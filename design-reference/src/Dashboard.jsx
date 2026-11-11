import React, { useEffect, useState } from 'react';
import { TopBar, DailyPlan, GoalsStrip } from './components/Header';
import { WidgetGrid } from './components/Widgets';
import { DailyTimeline } from './components/Timeline';
import { DashboardDialog } from './components/DashboardDialog';
import { profile, days, initialEvents, widgets } from './data';

function useSavedState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? initialValue : JSON.parse(stored);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Session state still works when browser storage is unavailable.
    }
  }, [key, value]);

  return [value, setValue];
}

export function Dashboard() {
  const [active, setActive] = useState('Overview');
  const [dayIndex, setDayIndex] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [visible, setVisible] = useSavedState('focus-widgets-v1', widgets.map((widget) => widget.id));
  const [eventsByDay, setEventsByDay] = useSavedState('focus-events-v1', { 0: initialEvents });
  const events = eventsByDay[dayIndex] ?? [];
  const projectMode = active === 'Projects';
  const shownEvents = projectMode ? events.filter((event) => event.priority === 'important') : events;

  function updateEvents(change) {
    setEventsByDay((previous) => ({ ...previous, [dayIndex]: change(previous[dayIndex] ?? []) }));
    setDialog(null);
  }

  function saveEvent(event) {
    updateEvents((current) => [...current.filter((item) => item.id !== event.id), event]);
  }

  return (
    <div className="frame">
      <div className="dashboard">
        <TopBar profile={profile} active={active} onNavigate={setActive} onDialog={(kind) => setDialog({ kind })} />
        <main>
          {active === 'Overview' && <DailyPlan onDialog={(kind) => setDialog({ kind })} />}
          {active !== 'Overview' && <h1 className="section-title">{active}</h1>}
          <GoalsStrip day={days[dayIndex]} onPrevious={() => setDayIndex(dayIndex - 1)} onNext={() => setDayIndex(dayIndex + 1)} previousDisabled={dayIndex === -1} nextDisabled={dayIndex === 1} />
          {active === 'Overview' && <WidgetGrid visible={visible} />}
          {active === 'Goals' ? (
            <section className="goals-detail" aria-label="Goal progress">
              <h2>Daily progress</h2>
              <progress value={days[dayIndex].completed} max={days[dayIndex].total} />
              <p>{days[dayIndex].total - days[dayIndex].completed} goals remaining</p>
            </section>
          ) : (
            <DailyTimeline events={shownEvents} projectMode={projectMode} dayLabel={dayIndex === 0 ? 'today' : dayIndex === -1 ? 'Oct 6' : 'Oct 8'} onAdd={() => setDialog({ kind: 'event' })} onEdit={(event) => setDialog({ kind: 'event', event })} />
          )}
        </main>
        {dialog && <DashboardDialog kind={dialog.kind} event={dialog.event} profile={profile} visible={visible} setVisible={setVisible} onSave={saveEvent} onDelete={(id) => updateEvents((current) => current.filter((event) => event.id !== id))} onClose={() => setDialog(null)} />}
      </div>
    </div>
  );
}
