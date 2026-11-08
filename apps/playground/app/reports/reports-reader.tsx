'use client';

import { useState } from 'react';
import { ClayFlowDiagram } from '@arsenal/clayflow/react';
import { REPORT_PERIODS, SAMPLE_REPORTS, type ReportPeriod } from './sample-reports';

export function ReportsReader() {
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [animating, setAnimating] = useState(false);
  const report = SAMPLE_REPORTS[period];

  const changePeriod = (next: ReportPeriod) => {
    if (next === period) return;
    setAnimating(true);
    window.setTimeout(() => {
      setPeriod(next);
      window.requestAnimationFrame(() => setAnimating(false));
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 120);
  };

  return (
    <main className="manthan-clay reports-page">
      <div className="reports-shell">
        <header className="reports-header">
          <div className="reports-brand" aria-label="Manthan Reports">
            <span className="reports-mark" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M20 35C8 29 7 16 20 5c13 11 12 24 0 30Z"/><path d="M20 35c-7-9-7-19 0-30 7 11 7 21 0 30ZM8 25c4 0 7 2 9 6m15-6c-4 0-7 2-9 6"/></svg></span>
            <span>Manthan <i>Reports</i></span>
          </div>
          <p className="reports-motto">Four horizons, one intelligence</p>
          <div className="reports-headline-row">
            <div>
              <p className="reports-kicker">A considered view of what is changing</p>
              <h1>Reports for a changing world.</h1>
              <p className="reports-intro">Follow a story from its first signal to the wider patterns around it.</p>
            </div>
            <div className="reports-period-control" role="group" aria-label="Report period">
              <span className="reports-period-thumb" data-period={period} aria-hidden="true" />
              {REPORT_PERIODS.map((item) => (
                <button key={item.id} type="button" aria-pressed={period === item.id} onClick={() => changePeriod(item.id)}>
                  <span>{item.label}</span><small>{item.cadence}</small>
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="reports-sample-banner" role="note">
          <span aria-hidden="true">✳</span>
          <strong>Sample report — not real news</strong>
          <span>Every company, person and event on this page is fictional.</span>
        </div>

        <article className={`report-content${animating ? ' is-changing' : ''}`} aria-live="polite" key={period}>
          <section className="report-summary clay-surface">
            <div className="report-summary-copy">
              <p className="reports-kicker">{report.eyebrow}</p>
              <h2>{report.title}</h2>
              <p className="report-deck">{report.summary}</p>
              <p className="report-context">{report.context}</p>
              <span className="report-topic">{report.focus}</span>
            </div>
            <div className="report-orbit" aria-hidden="true">
              <span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="orbit orbit-three" />
              <span className="orbit-center"><svg viewBox="0 0 52 52" fill="none"><path d="M26 45c-14-7-16-22 0-38 16 16 14 31 0 38Z"/><path d="M26 45c-8-12-8-26 0-38 8 12 8 26 0 38Zm-14-13c5 0 9 2 11 7m17-7c-5 0-9 2-11 7"/></svg></span>
            </div>
          </section>

          <section className="report-section">
            <div className="report-section-heading">
              <div><p className="reports-kicker">Connections</p><h2>How the story connects</h2></div>
              <p>People, organizations and events in the sample story</p>
            </div>
            <div className="report-diagram-card clay-surface">
              <ClayFlowDiagram spec={report.story} autoPlay initialStep={0} />
            </div>
          </section>

          <section className="report-section report-timeline-section">
            <div className="report-section-heading">
              <div><p className="reports-kicker">Sequence</p><h2>A timeline to hold the details</h2></div>
              <p>Illustrative milestones, with room for uncertainty</p>
            </div>
            <div className="report-diagram-card clay-surface">
              <ClayFlowDiagram spec={report.timeline} autoPlay initialStep={0} />
            </div>
          </section>

          {report.themes ? (
            <section className="report-section report-themes-section">
              <div className="report-section-heading">
                <div><p className="reports-kicker">Looking back</p><h2>Year in themes</h2></div>
                <p>Open each group to follow a thread</p>
              </div>
              <div className="report-diagram-card clay-surface">
                <ClayFlowDiagram spec={report.themes} autoPlay initialStep={0} />
              </div>
            </section>
          ) : null}
        </article>
        <footer className="reports-footer"><span>Manthan Reports</span><span>Sample content · for design illustration only</span></footer>
      </div>
    </main>
  );
}
