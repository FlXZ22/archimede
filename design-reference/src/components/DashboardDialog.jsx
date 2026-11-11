import React, { useState } from 'react';
import { priorities, widgets } from '../data';
import { Modal } from './Primitives';

const titles = {
  addWidget: 'Add Widget',
  customize: 'Customize dashboard',
  invite: 'Invite a teammate',
  notifications: 'Notifications',
  profile: 'Profile',
  event: 'Add an Event',
};

function inputTime(time) {
  const minutes = Math.round(time * 60);
  return [Math.floor(minutes / 60), minutes % 60].map((value) => String(value).padStart(2, '0')).join(':');
}

function readTime(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours + minutes / 60;
}

function EventForm({ event, onSave, onDelete }) {
  const [error, setError] = useState('');

  function save(submitEvent) {
    submitEvent.preventDefault();
    const values = new FormData(submitEvent.currentTarget);
    const title = values.get('title').trim();
    const start = readTime(values.get('start'));
    const end = readTime(values.get('end'));
    if (!title) return setError('Enter an event title.');
    if (start >= end) return setError('The end time must be after the start time.');
    onSave({ id: event?.id ?? crypto.randomUUID(), title, start, end, priority: values.get('priority') });
  }

  return (
    <form className="event-form" onSubmit={save}>
      <label>Event title<input name="title" required maxLength="65" defaultValue={event?.title} /></label>
      <div className="time-fields">
        <label>Start time<input name="start" type="time" required min="08:00" max="20:00" defaultValue={inputTime(event?.start ?? 9)} /></label>
        <label>End time<input name="end" type="time" required min="08:00" max="20:00" defaultValue={inputTime(event?.end ?? 10)} /></label>
      </div>
      <label>Priority<select name="priority" defaultValue={event?.priority ?? 'low'}>
        {Object.entries(priorities).map(([key, priority]) => <option key={key} value={key}>{priority.label}</option>)}
      </select></label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="form-actions">
        {event && <button type="button" className="text-button" onClick={() => onDelete(event.id)}>Delete event</button>}
        <button className="metal-button" type="submit">Save event</button>
      </div>
    </form>
  );
}

export function DashboardDialog({ kind, event, profile, visible, setVisible, onSave, onDelete, onClose }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [available] = useState(() => kind === 'addWidget' ? widgets.filter((widget) => !visible.includes(widget.id)) : widgets);

  return (
    <Modal title={kind === 'event' && event ? 'Edit event' : titles[kind]} onClose={onClose}>
      {(kind === 'customize' || kind === 'addWidget') && (
        <div className="widget-options">
          {available.map(({ id, title }) => (
            <label key={id}><input type="checkbox" checked={visible.includes(id)} onChange={(input) => {
              const next = input.target.checked ? [...visible, id] : visible.filter((item) => item !== id);
              setVisible(widgets.map((widget) => widget.id).filter((item) => next.includes(item)));
            }} /> {title}</label>
          ))}
          {!available.length && <p>All widgets are on your dashboard. Open Customize to hide a widget.</p>}
          <button className="metal-button" onClick={onClose}>Done</button>
        </div>
      )}
      {kind === 'event' && <EventForm event={event} onSave={onSave} onDelete={onDelete} />}
      {kind === 'notifications' && <p className="dialog-copy">You’re all caught up.</p>}
      {kind === 'profile' && <div className="dialog-profile"><img src={profile.image} alt="" /><p>{profile.name}</p></div>}
      {kind === 'invite' && (
        <form className="event-form" onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          setInviteEmail(new FormData(submitEvent.currentTarget).get('email'));
        }}>
          <label>Teammate’s email<input type="email" name="email" required /></label>
          <button type="submit" className="metal-button">Prepare invite</button>
          {inviteEmail && <p role="status">Demo invitation prepared for {inviteEmail}. No email was sent.</p>}
        </form>
      )}
    </Modal>
  );
}
