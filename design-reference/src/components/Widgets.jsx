import React, { useEffect, useState } from 'react';
import { focusBars, warmBars } from '../data';
import { Icon } from './Primitives';

export function DeepWorkCard({ initialSeconds = 85 * 60 }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    let elapsed = 0;
    const tick = window.setInterval(() => {
      const next = Math.floor((Date.now() - started) / 1000);
      if (next === elapsed) return;
      const delta = next - elapsed;
      elapsed = next;
      setSeconds((value) => value + delta);
    }, 500);
    return () => window.clearInterval(tick);
  }, [running]);

  return (
    <article className="metric-card deep-work">
      <h2>Deep Work Time</h2>
      <button className="timer-button" aria-label={running ? 'Pause timer' : 'Resume timer'} onClick={() => setRunning(!running)}>
        <Icon name={running ? 'pause' : 'play'} />
      </button>
      <p className="metric-value">{Math.floor(seconds / 3600)}h {Math.floor(seconds / 60) % 60}m</p>
    </article>
  );
}

export function AttentionCard({ value = 88, period = 'Last 60 min' }) {
  return (
    <article className="metric-card attention">
      <h2>Attention Quality</h2>
      <p className="metric-value">{value}%</p>
      <span className="period">{period}</span>
    </article>
  );
}

export function FocusCard({ score = 64, bars = focusBars, warm = warmBars, peak = '11 am' }) {
  return (
    <article className="metric-card focus-card">
      <h2>Focus Stability</h2>
      <p className="score">Current Score: <strong>{score}</strong></p>
      <div className="focus-plot" role="img" aria-label={`Focus stability. Current score ${score}. Peak at ${peak}.`}>
        <div className="chart-bars" aria-hidden="true">
          {bars.map((height, index) => <div className={warm.has(index) ? 'chart-bar warm' : 'chart-bar'} key={index} style={{ height: `${height}%` }} />)}
        </div>
        <div className="chart-guide" aria-hidden="true" />
        <span className="chart-callout" aria-hidden="true">Peak: {peak}</span>
      </div>
    </article>
  );
}

const widgetComponents = { deepWork: DeepWorkCard, attention: AttentionCard, focus: FocusCard };

export function WidgetGrid({ visible }) {
  return (
    <section className="widget-grid" aria-label="Focus widgets" data-count={visible.length}>
      {visible.map((id) => {
        const Card = widgetComponents[id];
        return <Card key={id} />;
      })}
      {!visible.length && <p className="empty-widgets">Add a widget to see your focus metrics.</p>}
    </section>
  );
}
