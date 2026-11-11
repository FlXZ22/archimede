import React from 'react';
import { priorities } from '../data';
import { Icon } from './Primitives';

const hours = Array.from({ length: 13 }, (_, index) => index + 8);

export function formatTime(time) {
  const totalMinutes = Math.round(time * 60);
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${hour % 12 || 12}${minute ? ':' + String(minute).padStart(2, '0') : ''} ${hour < 12 ? 'AM' : 'PM'}`;
}

function positionEvents(events) {
  const laneEnds = [];
  return events.map((event) => {
    const preferredLane = event.id === 'materials' ? 1 : 0;
    let lane = preferredLane;
    while ((laneEnds[lane] ?? 0) > event.start) lane += 1;
    laneEnds[lane] = event.end;
    return { ...event, lane };
  });
}

export function PriorityPill({ priority }) {
  return <span className={`priority priority--${priority}`}><i />{priorities[priority].label}</span>;
}

export function EventPill({ event, onClick }) {
  return (
    <button type="button" className="event-pill" style={{ '--start': (event.start - 8) / 12, '--duration': (event.end - event.start) / 12, '--lane': event.lane }} onClick={onClick}>
      <span className="event-icon"><Icon name={priorities[event.priority].icon} /></span>
      <span className="event-copy"><strong>{event.title}</strong><span className="event-time">{formatTime(event.start)} – {formatTime(event.end)}</span></span>
      <PriorityPill priority={event.priority} />
    </button>
  );
}

export function DailyTimeline({ events, onAdd, onEdit, projectMode = false, dayLabel = 'today' }) {
  const positioned = positionEvents([...events].sort((a, b) => a.start - b.start));
  const laneCount = Math.max(2, ...positioned.map((event) => event.lane + 1));

  return (
    <section className="timeline" aria-labelledby="timeline-title">
      <div className="timeline-heading">
        <h2 id="timeline-title">{projectMode ? 'Projects' : 'Daily Timeline'}</h2>
        <p>{events.length} {events.length === 1 ? 'Task' : 'Tasks'} for {dayLabel}</p>
        <button className="text-button" onClick={onAdd}>Add an Event</button>
      </div>
      <div className="timeline-plot" style={{ '--lanes': laneCount }}>
        <div className="hours" aria-hidden="true">
          {hours.map((hour) => <span key={hour}>{formatTime(hour)}</span>)}
        </div>
        <div className="timeline-grid" aria-hidden="true">
          {hours.map((hour) => <i key={hour} />)}
        </div>
        {positioned.map((event) => <EventPill key={event.id} event={event} onClick={() => onEdit(event)} />)}
        {!events.length && <p className="empty-timeline">No events scheduled.</p>}
      </div>
    </section>
  );
}
