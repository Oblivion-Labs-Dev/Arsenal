'use client';

import { useState, type ComponentProps } from 'react';
import { ClayFlowDiagram } from '@arsenal/clayflow/react';
import '@arsenal/clayflow/react.css';
import './showcase.css';
import {
  COMPONENT_STATE_SPECS,
  CONNECTOR_SPECS,
  EXAMPLE_DIAGRAMS,
  STRESS_SPECS,
  TRANSFORMATION_RECIPES,
} from '@arsenal/clayflow';

type DiagramAPI = Parameters<NonNullable<ComponentProps<typeof ClayFlowDiagram>['onReady']>>[0];
const STATE_LABELS = ['Rest', 'Hover', 'Active', 'Complete', 'Error', 'Reduced'] as const;

function StatePreview({ spec }: { spec: (typeof COMPONENT_STATE_SPECS)[number] }) {
  const [api, setApi] = useState<DiagramAPI | null>(null);
  const [preview, setPreview] = useState('rest');
  const [reducedMount, setReducedMount] = useState(false);
  const stateStep = { Rest: 0, Active: 1, Complete: 3, Error: 2 } as const;

  const trigger = (label: (typeof STATE_LABELS)[number]) => {
    if (label === 'Reduced') {
      setReducedMount(true);
      setPreview('reduced');
      return;
    }
    setReducedMount(false);
    setPreview(label.toLowerCase());
    if (label === 'Hover') {
      api?.pause();
      api?.seek(0);
      return;
    }
    api?.pause();
    api?.seek(stateStep[label]);
  };

  return (
    <article className={`showcase-card state-card ${preview === 'hover' ? 'is-preview-hover' : ''}`}>
      <div className="showcase-card-head"><h3>{spec.nodes[0]?.label}</h3><span>Node state</span></div>
      <div className="state-diagram" aria-label={`${spec.nodes[0]?.label} state preview`}>
        <ClayFlowDiagram key={reducedMount ? 'reduced' : 'motion'} spec={spec} initialStep={reducedMount ? 3 : 0} onReady={setApi} />
      </div>
      <div className="state-triggers" role="group" aria-label={`${spec.nodes[0]?.label} state controls`}>
        {STATE_LABELS.map((label) => <button key={label} type="button" className={preview === label.toLowerCase() ? 'is-active' : ''} aria-pressed={preview === label.toLowerCase()} onClick={() => trigger(label)}>{label}</button>)}
      </div>
      {reducedMount && <p className="reduced-note">Static final state for reduced motion.</p>}
    </article>
  );
}

export function ClayFlowShowcase() {
  const [showStress, setShowStress] = useState(false);
  const examples = Object.entries(EXAMPLE_DIAGRAMS);
  const exampleNames: Record<string, string> = {
    dataPipeline: 'Data pipeline', aiAgentWorkflow: 'AI agent workflow', decisionTree: 'Decision tree',
    conditionalLoop: 'Conditional loop', stockResearch: 'Stock research', storyConnection: 'Story connection', timeline: 'Timeline',
  };

  return (
    <main className="clay-showcase">
      <div className="showcase-shell">
        <header className="showcase-hero">
          <a className="showcase-back" href="/clayflow">← ClayFlow library</a>
          <p className="showcase-kicker">Animation lab</p>
          <h1>ClayFlow, in motion.</h1>
          <p className="showcase-intro">A hands-on tour of state, flow, and transformation. Each sample is small enough to understand and real enough to run.</p>
          <div className="hero-signature" aria-hidden="true"><span /><span /><span /><i /></div>
        </header>

        <section className="showcase-section" aria-labelledby="states-title">
          <div className="section-heading"><div><p className="showcase-kicker">01 / Components</p><h2 id="states-title">One node. Six states.</h2></div><p>Use the controls to preview the motion families and the final reduced-motion frame.</p></div>
          <div className="state-grid">{COMPONENT_STATE_SPECS.map((spec) => <StatePreview key={spec.id} spec={spec} />)}</div>
        </section>

        <section className="showcase-section" aria-labelledby="connectors-title">
          <div className="section-heading"><div><p className="showcase-kicker">02 / Connections</p><h2 id="connectors-title">Every route has a shape.</h2></div><p>Direction, condition, repetition, and feedback stay legible in the line itself.</p></div>
          <div className="connector-grid">{CONNECTOR_SPECS.map((spec) => <article className="showcase-card connector-card" key={spec.id}><h3>{spec.title}</h3><ClayFlowDiagram spec={spec} /></article>)}</div>
        </section>

        <section className="showcase-section" aria-labelledby="examples-title">
          <div className="section-heading"><div><p className="showcase-kicker">03 / Stories</p><h2 id="examples-title">A flow you can follow.</h2></div><p>Play, pause, replay, reset, step through, or change speed with the built-in controls. Select a node to inspect its role and evidence.</p></div>
          <div className="example-grid">{examples.map(([key, spec], index) => <article className={`showcase-card example-card ${index === 0 || index === 1 ? 'example-wide' : ''}`} key={spec.id}>
            <div className="example-title"><div><p className="example-index">0{index + 1}</p><h3>{exampleNames[key]}</h3></div>{spec.illustrative && <span className="illustrative-tag">Illustrative</span>}</div>
            <p className="example-caption">{spec.summary}</p>
            <ClayFlowDiagram spec={spec} />
          </article>)}</div>
        </section>

        <section className="showcase-section" aria-labelledby="recipes-title">
          <div className="section-heading"><div><p className="showcase-kicker">04 / Transformations</p><h2 id="recipes-title">Change what a node means.</h2></div><p>Transform steps update a node's kind and label while the rest of its flow stays in place.</p></div>
          <div className="recipe-grid">{TRANSFORMATION_RECIPES.map((spec) => <article className="showcase-card recipe-card" key={spec.id}><h3>{spec.title}</h3><p>{spec.summary}</p><ClayFlowDiagram spec={spec} /></article>)}</div>
        </section>

        <section className="showcase-section stress-section" aria-labelledby="stress-title">
          <div className="section-heading"><div><p className="showcase-kicker">05 / Runtime</p><h2 id="stress-title">Six diagrams, one mount.</h2></div><div className="stress-action"><p>Mount or release a set of independent diagrams together.</p><button type="button" className="mount-button" aria-expanded={showStress} onClick={() => setShowStress((current) => !current)}>{showStress ? 'Unmount all' : 'Mount all'}</button></div></div>
          {showStress && <div className="stress-grid">{STRESS_SPECS.map((spec) => <article className="showcase-card stress-card" key={spec.id}><h3>{spec.nodes[0]?.label}</h3><ClayFlowDiagram spec={spec} /></article>)}</div>}
        </section>

        <footer className="showcase-footer"><span>ClayFlow component library</span><a href="/clayflow">Back to the full gallery ↑</a></footer>
      </div>
    </main>
  );
}
