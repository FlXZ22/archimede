import React, { useId, useState } from "react";
import { TOPIC_SHORT } from "./learning.mjs";
export function TopicChart({ topics, onTrain }) {
  const id = useId().replace(/:/g, "");
  return (
    <section className="panel skills-panel" aria-labelledby="skills-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">PUNTI FORTI E MARGINI DI MIGLIORAMENTO</p>
          <h2 id="skills-title">La mappa delle tue abilità</h2>
        </div>
        <span className="soft-label">Primi tentativi</span>
      </div>
      <p className="muted chart-description">
        Percentuale di risposte corrette su problemi diversi. Seleziona un
        argomento per allenarlo.
      </p>
      <div
        className="skill-chart"
        role="group"
        aria-label="Accuratezza per argomento, da 0 a 100 per cento"
      >
        <div className="chart-axis" aria-hidden="true">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
        {topics.map((t) => (
          <button
            key={t.topic}
            className="skill-row"
            onClick={() => onTrain(t.topic)}
            aria-label={`${t.topic}: ${t.n ? `${t.accuracy}% corrette su ${t.n} problemi. ${t.status}. Intervallo indicativo ${t.low}–${t.high}%.` : "ancora nessun risultato"}. Allenati su questo argomento.`}
          >
            <span className="skill-name">{TOPIC_SHORT[t.topic]}</span>
            <span className="skill-track">
              <span className="skill-midline" />
              {t.n > 0 && (
                <span
                  className={`skill-fill ${t.status === "da allenare" ? "warm" : t.status === "punto forte" ? "mint" : ""}`}
                  style={{ width: `${Math.max(t.accuracy, 1)}%` }}
                />
              )}
              <span className="skill-tooltip">
                {t.n
                  ? `${t.correct}/${t.n} corrette · ${t.status} · intervallo indicativo ${t.low}–${t.high}%`
                  : "Nessun dato: inizia un allenamento"}
              </span>
            </span>
            <span className="skill-value">
              {t.accuracy === null ? "—" : `${t.accuracy}%`}
              <small>{t.n} problemi</small>
            </span>
          </button>
        ))}
      </div>
      <div className="chart-legend">
        <span>
          <i className="legend-dot warm" />
          Da allenare
        </span>
        <span>
          <i className="legend-dot mint" />
          Punto forte
        </span>
        <span>
          <i className="legend-dot" />
          In osservazione
        </span>
      </div>
      <details className="method-details">
        <summary>Come leggere i risultati</summary>
        <p>
          Fino a 4 problemi un argomento resta da esplorare. Da 5 problemi e
          sotto il 60% diventa una priorità; da 8 problemi e almeno il 75% è un
          punto forte. Le ripetizioni e le varianti dello stesso testo non
          aumentano il campione. La barra mostra l’accuratezza osservata, non
          una previsione della gara. L’intervallo indicativo al 95% è calcolato
          con il metodo di Wilson.
        </p>
        <p>
          Le categorie sono in parte assegnate automaticamente: puoi correggerle
          nel riepilogo di ogni prova.
        </p>
      </details>
    </section>
  );
}
export function TrendChart({ points }) {
  const [hover, setHover] = useState(null),
    id = useId().replace(/:/g, "");
  const w = 520,
    h = 155,
    pad = 15;
  const xy = points.map((p, i) => ({
    x:
      pad +
      (points.length === 1 ? 0.5 : i / (points.length - 1)) * (w - pad * 2),
    y: pad + ((100 - p.accuracy) / 100) * (h - pad * 2),
    ...p,
  }));
  const line = xy.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  return (
    <div className="trend-chart">
      <div className="trend-top">
        <h2>Il ritmo dei tuoi progressi</h2>
        <span className="soft-label">Ultime 8 prove</span>
      </div>
      {!points.length ? (
        <div className="empty-chart">
          <span className="empty-line" />
          <p>Il grafico partirà dalla tua prima prova.</p>
        </div>
      ) : (
        <>
          <div className="trend-labels">
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
          </div>
          <svg
            viewBox={`0 0 ${w} ${h}`}
            role="img"
            aria-label={`Accuratezza nelle ultime ${points.length} prove: ${points.map((p) => p.accuracy + "%").join(", ")}. Include anche eventuali ripassi.`}
          >
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#f4bd58" stopOpacity=".34" />
                <stop offset="1" stopColor="#f4bd58" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 50, 100].map((v) => (
              <line
                key={v}
                x1={pad}
                x2={w - pad}
                y1={pad + ((100 - v) / 100) * (h - pad * 2)}
                y2={pad + ((100 - v) / 100) * (h - pad * 2)}
                stroke="#353639"
                strokeDasharray="3 6"
              />
            ))}
            {points.length > 1 && (
              <path
                d={`${line}L${xy.at(-1).x},${h - pad}L${xy[0].x},${h - pad}Z`}
                fill={`url(#${id})`}
              />
            )}
            <path d={line} stroke="#efbc64" strokeWidth="2.5" fill="none" />
            {xy.map((p, i) => (
              <g
                key={p.id}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hover === i ? 5 : 3.5}
                  fill="#f7ce8a"
                />
                <title>
                  {new Date(p.at).toLocaleDateString("it-IT")}: {p.correct}/
                  {p.total} corrette ({p.accuracy}%)
                </title>
              </g>
            ))}
          </svg>
          <div className="trend-foot">
            <span>
              {new Date(points[0].at).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <span>
              {hover !== null
                ? `${points[hover].correct}/${points[hover].total} corrette · ${points[hover].accuracy}%`
                : points.length < 2
                  ? "Completa una seconda prova per vedere l’andamento."
                  : "Accuratezza per prova · include i ripassi"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
