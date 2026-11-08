import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { fromModelOutput, EXAMPLES, TOPIC_THEMES, type TopicTheme } from "../index.js";
import { ClayFlowDiagram } from "./ClayFlowDiagram.js";
import {
  animDataFlowSpec,
  animPulseSpec, animExpandSpec, animCycleSpec,
  animDecisionBranchSpec,
  animFanOutInSpec,
  animHighlightSpec,
  animLoopSpec,
  animParallelSpec,
  animProgressSpec,
  animRequestResponseSpec,
  animRetryFailureSpec,
  animStateTransitionSpec,
  animStepRevealSpec,
  animTimelineSpec,
  annotationsOverviewSpec,
  connectorsOverviewSpec,
  groupsOverviewSpec,
  nodesArchitectureSpec,
  nodesAdditionalSpec,
  nodesDataSpec,
  nodesDomainSpec,
  nodesLogicBranchingSpec,
  nodesLogicOutcomesSpec,
  nodesProgressSpec,
  sectionGroupSpec, newAnnotationSpec, topicThemesSpec,
  progressMetricsOverviewSpec,
  statesOverviewSpec,
} from "./gallery-specs.js";
import "./clayflow-gallery.css";

const PRESET_SPECS = [
  { name: "data-flow", spec: animDataFlowSpec },
  { name: "request-response", spec: animRequestResponseSpec },
  { name: "step-reveal", spec: animStepRevealSpec },
  { name: "parallel", spec: animParallelSpec },
  { name: "decision-branch", spec: animDecisionBranchSpec },
  { name: "retry-failure", spec: animRetryFailureSpec },
  { name: "loop", spec: animLoopSpec },
  { name: "progress", spec: animProgressSpec },
  { name: "fan-out-in", spec: animFanOutInSpec },
  { name: "timeline", spec: animTimelineSpec },
  { name: "state-transition", spec: animStateTransitionSpec },
  { name: "highlight", spec: animHighlightSpec },
  { name: "pulse", spec: animPulseSpec },
  { name: "expand", spec: animExpandSpec },
  { name: "cycle", spec: animCycleSpec },
];

/** `headerAction` fills the slot Sutra used for its theme toggle; the host app supplies its own. */
export function ClayFlowGallery({ headerAction }: { headerAction?: ReactNode } = {}) {
  // Reduced motion toggle state on <html>
  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("force-reduced");
  });

  const toggleReducedMotion = () => {
    const next = !isReducedMotion;
    setIsReducedMotion(next);
    if (typeof document !== "undefined") {
      if (next) {
        document.documentElement.classList.add("force-reduced");
      } else {
        document.documentElement.classList.remove("force-reduced");
      }
    }
  };

  // Example narrative modes (ELI5 vs Technical Architecture)
  const [exampleModes, setExampleModes] = useState<Record<string, "eli5" | "advanced">>({});

  // Playground state
  const exampleKeys = useMemo(() => Object.keys(EXAMPLES), []);
  const initialExampleKey = exampleKeys[0] ?? "ai-agent-request";
  const [selectedExampleKey, setSelectedExampleKey] = useState<string>(initialExampleKey);
  const [rawJson, setRawJson] = useState<string>(() => {
    const initial = EXAMPLES[initialExampleKey];
    return initial ? JSON.stringify(initial, null, 2) : "{}";
  });
  const [debouncedJson, setDebouncedJson] = useState<string>(rawJson);

  // 250ms debounce for playground input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedJson(rawJson);
    }, 250);
    return () => clearTimeout(timer);
  }, [rawJson]);

  // Exercise the LLM tolerant parser
  const parseResult = useMemo(() => {
    return fromModelOutput(debouncedJson);
  }, [debouncedJson]);

  const handleSelectExample = (e: ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value;
    setSelectedExampleKey(key);
    const ex = EXAMPLES[key];
    if (ex) {
      setRawJson(JSON.stringify(ex, null, 2));
    }
  };

  const handleSetExampleMode = (key: string, mode: "eli5" | "advanced") => {
    setExampleModes((prev) => ({ ...prev, [key]: mode }));
  };

  return (
    <div className="cfg-page">
      {/* Sticky Top Bar */}
      <header className="cfg-header">
        <div className="cfg-header-inner">
          <div className="cfg-brand">
            <span className="cfg-brand-title">ClayFlow</span>
            <span className="cfg-badge">Component Library</span>
          </div>

          <nav className="cfg-nav" aria-label="Gallery sections">
            <a href="#nodes" className="cfg-nav-link">
              Nodes
            </a>
            <a href="#states" className="cfg-nav-link">
              States
            </a>
            <a href="#connectors" className="cfg-nav-link">
              Connectors
            </a>
            <a href="#groups" className="cfg-nav-link">
              Groups
            </a>
            <a href="#annotations" className="cfg-nav-link">
              Annotations
            </a>
            <a href="#metrics" className="cfg-nav-link">
              Metrics
            </a>
            <a href="#presets" className="cfg-nav-link">
              Presets
            </a>
            <a href="#themes" className="cfg-nav-link">Themes</a>
            <a href="#examples" className="cfg-nav-link">
              Examples
            </a>
            <a href="#playground" className="cfg-nav-link">
              Playground
            </a>
          </nav>

          <div className="cfg-controls-group">
            <button
              type="button"
              className={`cfg-motion-toggle ${isReducedMotion ? "is-active" : ""}`}
              onClick={toggleReducedMotion}
              aria-pressed={isReducedMotion}
              title="Toggle forced reduced motion"
            >
              <span className="cfg-motion-indicator" aria-hidden="true" />
              <span>Reduced motion</span>
            </button>
            {headerAction}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="cfg-container">
        {/* Hero */}
        <section className="cfg-hero">
          <div className="cfg-hero-eyebrow">Internal Laboratory · Phase 5</div>
          <h1 className="cfg-hero-title">ClayFlow component library</h1>
          <p className="cfg-hero-desc">
            Framework-agnostic HTML renderer, responsive SVG connector routing, and deterministic
            motion timeline scheduler designed for Manthan reader articles and Sutra automation
            workflows.
          </p>
        </section>

        {/* 1. Nodes Catalog */}
        <section id="nodes" className="cfg-section">
          <div className="cfg-section-header">
            <div className="cfg-section-title-wrap">
              <h2 className="cfg-section-title">1. Node Catalog</h2>
              <p className="cfg-section-desc">
                Every node kind in NODE_KINDS, grouped by catalog family in compact diagrams with
                labels.
              </p>
            </div>
          </div>

          <div className="cfg-grid-two">
            <div className="cfg-card">
              <div className="cfg-card-header">
                <h3 className="cfg-card-title">Core Architecture (8)</h3>
                <span className="cfg-card-meta">Family: node</span>
              </div>
              <ClayFlowDiagram spec={nodesArchitectureSpec} />
            </div>

            <div className="cfg-card">
              <div className="cfg-card-header">
                <h3 className="cfg-card-title">Logic Decisions & Loops (5)</h3>
                <span className="cfg-card-meta">Family: logic</span>
              </div>
              <ClayFlowDiagram spec={nodesLogicBranchingSpec} />
            </div>

            <div className="cfg-card">
              <div className="cfg-card-header">
                <h3 className="cfg-card-title">Concurrency & Outcomes (4)</h3>
                <span className="cfg-card-meta">Family: logic</span>
              </div>
              <ClayFlowDiagram spec={nodesLogicOutcomesSpec} />
            </div>

            <div className="cfg-card">
              <div className="cfg-card-header">
                <h3 className="cfg-card-title">Data & Storage (8)</h3>
                <span className="cfg-card-meta">Family: data</span>
              </div>
              <ClayFlowDiagram spec={nodesDataSpec} />
            </div>

            <div className="cfg-card">
              <div className="cfg-card-header">
                <h3 className="cfg-card-title">Domain Intelligence (6)</h3>
                <span className="cfg-card-meta">Family: domain</span>
              </div>
              <ClayFlowDiagram spec={nodesDomainSpec} />
            </div>

            <div className="cfg-card"><div className="cfg-card-header"><h3 className="cfg-card-title">Domain & People (11)</h3><span className="cfg-card-meta">Families: domain · people</span></div><ClayFlowDiagram spec={nodesAdditionalSpec} /></div>

            <div className="cfg-card">
              <div className="cfg-card-header">
                <h3 className="cfg-card-title">Progress & Metrics (6)</h3>
                <span className="cfg-card-meta">Family: progress</span>
              </div>
              <ClayFlowDiagram spec={nodesProgressSpec} />
            </div>
          </div>
        </section>

        {/* 2. States */}
        <section id="states" className="cfg-section">
          <div className="cfg-section-header">
            <div className="cfg-section-title-wrap">
              <h2 className="cfg-section-title">2. Lifecycle States</h2>
              <p className="cfg-section-desc">
                All eight NODE_STATES values demonstrated uniformly on the process node kind.
              </p>
            </div>
          </div>
          <ClayFlowDiagram spec={statesOverviewSpec} />
        </section>

        {/* 3. Connectors */}
        <section id="connectors" className="cfg-section">
          <div className="cfg-section-header">
            <div className="cfg-section-title-wrap">
              <h2 className="cfg-section-title">3. Connectors & Geometries</h2>
              <p className="cfg-section-desc">
                Straight, curved, orthogonal, dashed, bidirectional, labelled, animated, and
                parallel lanes.
              </p>
            </div>
          </div>
          <ClayFlowDiagram spec={connectorsOverviewSpec} />
        </section>

        {/* 4. Groups */}
        <section id="groups" className="cfg-section">
          <div className="cfg-section-header">
            <div className="cfg-section-title-wrap">
              <h2 className="cfg-section-title">4. Groups & Boundaries</h2>
              <p className="cfg-section-desc">
                Module regions, security boundaries, and nested group hierarchies up to depth 2.
              </p>
            </div>
          </div>
          <ClayFlowDiagram spec={groupsOverviewSpec} />
          <div className="cfg-card"><div className="cfg-card-header"><h3 className="cfg-card-title">Labeled Section</h3><span className="cfg-card-meta">Group: section</span></div><ClayFlowDiagram spec={sectionGroupSpec} /></div>
        </section>

        {/* 5. Annotations */}
        <section id="annotations" className="cfg-section">
          <div className="cfg-section-header">
            <div className="cfg-section-title-wrap">
              <h2 className="cfg-section-title">5. Annotations</h2>
              <p className="cfg-section-desc">
                All eight ANNOTATION_KINDS values: success, pending, error, warning, info, callout,
                tooltip, label.
              </p>
            </div>
          </div>
          <ClayFlowDiagram spec={annotationsOverviewSpec} />
          <div className="cfg-card"><div className="cfg-card-header"><h3 className="cfg-card-title">New Badge</h3><span className="cfg-card-meta">Annotation: new</span></div><ClayFlowDiagram spec={newAnnotationSpec} /></div>
        </section>

        {/* 6. Progress and Metrics */}
        <section id="metrics" className="cfg-section">
          <div className="cfg-section-header">
            <div className="cfg-section-title-wrap">
              <h2 className="cfg-section-title">6. Progress & Metrics</h2>
              <p className="cfg-section-desc">
                Progress rings, progress bars, dials, counters, timeline milestones, and
                quantitative chips.
              </p>
            </div>
          </div>
          <ClayFlowDiagram spec={progressMetricsOverviewSpec} />
        </section>

        {/* 7. Animation Presets */}
        <section id="presets" className="cfg-section">
          <div className="cfg-section-header">
            <div className="cfg-section-title-wrap">
              <h2 className="cfg-section-title">7. Animation Presets</h2>
              <p className="cfg-section-desc">
                The fifteen built-in ANIMATION_PRESETS compiled into deterministic step timelines.
              </p>
            </div>
          </div>

          <div className="cfg-grid-three">
            {PRESET_SPECS.map(({ name, spec }) => (
              <div key={name} className="cfg-card">
                <div className="cfg-card-header">
                  <h3 className="cfg-card-title">{name}</h3>
                  <span className="cfg-card-meta">Preset</span>
                </div>
                <ClayFlowDiagram spec={spec} />
              </div>
            ))}
          </div>
        </section>

        <section id="themes" className="cfg-section"><div className="cfg-section-header"><div className="cfg-section-title-wrap"><h2 className="cfg-section-title">Topic Themes</h2><p className="cfg-section-desc">Six opt-in accent palettes with suggested node kinds.</p></div></div><div className="cfg-grid-three">{(Object.entries(TOPIC_THEMES) as [TopicTheme, (typeof TOPIC_THEMES)[TopicTheme]][]).map(([topic, theme]) => <div key={topic} className="cfg-card"><div className="cfg-card-header"><h3 className="cfg-card-title">{theme.label}</h3><span className="cfg-card-meta">Suggested: {theme.suggestedKinds.join(" · ")}</span></div><ClayFlowDiagram spec={{ ...topicThemesSpec, id: `theme-${topic}`, title: `${theme.label} Theme`, topic }} /></div>)}</div></section>

        {/* 8. Examples */}
        <section id="examples" className="cfg-section">
          <div className="cfg-section-header">
            <div className="cfg-section-title-wrap">
              <h2 className="cfg-section-title">8. Full Production Examples</h2>
              <p className="cfg-section-desc">
                The five end-to-end EXAMPLES with interactive ELI5 and Technical Architecture mode
                toggles.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {Object.entries(EXAMPLES).map(([key, exampleSpec]) => {
              const currentMode = exampleModes[key] ?? "eli5";
              return (
                <div key={key} className="cfg-card">
                  <div className="cfg-card-header">
                    <div>
                      <h3 className="cfg-card-title">{exampleSpec.title}</h3>
                      {exampleSpec.summary && (
                        <span className="cfg-card-meta">{exampleSpec.summary}</span>
                      )}
                    </div>
                    <div
                      className="cfg-segmented"
                      role="group"
                      aria-label="Explanation detail level"
                    >
                      <button
                        type="button"
                        className={`cfg-segmented-btn ${currentMode === "eli5" ? "is-active" : ""}`}
                        onClick={() => handleSetExampleMode(key, "eli5")}
                        aria-pressed={currentMode === "eli5"}
                      >
                        ELI5
                      </button>
                      <button
                        type="button"
                        className={`cfg-segmented-btn ${currentMode === "advanced" ? "is-active" : ""}`}
                        onClick={() => handleSetExampleMode(key, "advanced")}
                        aria-pressed={currentMode === "advanced"}
                      >
                        Advanced
                      </button>
                    </div>
                  </div>
                  <ClayFlowDiagram spec={exampleSpec} mode={currentMode} />
                </div>
              );
            })}
          </div>
        </section>

        {/* 9. Playground */}
        <section id="playground" className="cfg-section">
          <div className="cfg-section-header">
            <div className="cfg-section-title-wrap">
              <h2 className="cfg-section-title">9. Spec Playground & LLM Adapter</h2>
              <p className="cfg-section-desc">
                Live editor validating input through fromModelOutput() with 250ms debounce and
                accessible fallback rendering.
              </p>
            </div>
          </div>

          <div className="cfg-playground-layout">
            <div className="cfg-playground-pane">
              <div className="cfg-playground-controls">
                <label
                  style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}
                >
                  Load template:
                  <select
                    className="cfg-select"
                    value={selectedExampleKey}
                    onChange={handleSelectExample}
                    aria-label="Load diagram template"
                  >
                    {exampleKeys.map((k) => (
                      <option key={k} value={k}>
                        {EXAMPLES[k]?.title ?? k}
                      </option>
                    ))}
                  </select>
                </label>

                <span
                  className={`cfg-status-chip ${parseResult.ok ? "is-valid" : "is-invalid"}`}
                  role="status"
                >
                  {parseResult.ok ? "Valid Specification" : `Errors: ${parseResult.errors.length}`}
                </span>
              </div>

              <textarea
                className="cfg-textarea"
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                spellCheck={false}
                aria-label="Diagram JSON editor"
              />

              {!parseResult.ok && (
                <div className="cfg-errors" role="status">
                  <p className="cfg-errors-title">
                    Validation Diagnostics ({parseResult.errors.length}):
                  </p>
                  <ul>
                    {parseResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="cfg-playground-pane">
              {parseResult.ok ? (
                <ClayFlowDiagram spec={parseResult.diagram} />
              ) : (
                <ClayFlowDiagram spec={parseResult.fallback} />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
