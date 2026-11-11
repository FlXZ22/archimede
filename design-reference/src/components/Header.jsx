import React from 'react';
import { Icon, IconButton } from './Primitives';
import { sections } from '../data';

export function TopBar({ profile, active, onNavigate, onDialog }) {
  return (
    <header className="top-bar">
      <button className="brand" aria-label="Dashboard overview" onClick={() => onNavigate('Overview')}>
        <img src="assets/brand-mark.png" alt="" />
      </button>
      <nav className="navigation" aria-label="Dashboard">
        {sections.map((section) => (
          <button key={section} className="nav-item" aria-current={active === section ? 'page' : undefined} onClick={() => onNavigate(section)}>
            {section}
            {active === section && <svg viewBox="0 0 88 8" preserveAspectRatio="none" aria-hidden="true"><path d="M0 1.5h34c5 0 8 2 10 5 2-3 5-5 10-5h34" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg>}
          </button>
        ))}
      </nav>
      <div className="account-actions">
        <IconButton icon="invite" label="Invite a teammate" onClick={() => onDialog('invite')} />
        <IconButton icon="bell" label="Notifications" onClick={() => onDialog('notifications')} />
        <button className="profile" onClick={() => onDialog('profile')} aria-label={`Profile for ${profile.name}`}>
          <img src={profile.image} alt="" />
          <span>{profile.name}</span>
          <Icon name="chevron" />
        </button>
      </div>
    </header>
  );
}

export function DailyPlan({ onDialog }) {
  return (
    <section className="daily-plan" aria-labelledby="dashboard-title">
      <div className="hero-title">
        <p>Your daily plan</p>
        <h1 id="dashboard-title">Stay on Track Today</h1>
      </div>
      <div className="goal-message">
        <img src="assets/goal-check.png" alt="" />
        <div><p>Keep it going!</p><span>You’ve done all previous tasks!</span></div>
      </div>
      <div className="hero-actions">
        <button className="add-widget" onClick={() => onDialog('addWidget')}><span><Icon name="plus" /></span>Add Widget</button>
        <button className="metal-button" onClick={() => onDialog('customize')}>Customize</button>
      </div>
    </section>
  );
}

const monthFormat = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' });

export function GoalsStrip({ day, onPrevious, onNext, previousDisabled, nextDisabled }) {
  const date = new Date(day.date);
  return (
    <section className="goals-strip" aria-label="Your daily goals">
      <time className="date-tile" dateTime={day.date}><strong>{date.getUTCDate()}</strong><span>{monthFormat.format(date)}</span></time>
      <div className="goals-copy" aria-live="polite">
        <h2>Your Daily Goals</h2>
        <p><strong>{day.completed}/{day.total}</strong> completed</p>
      </div>
      <div className="date-actions">
        <IconButton icon="left" label="Previous day" disabled={previousDisabled} onClick={onPrevious} />
        <IconButton icon="right" label="Next day" disabled={nextDisabled} onClick={onNext} />
      </div>
    </section>
  );
}
