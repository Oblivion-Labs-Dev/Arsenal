import type { DiagramSpec } from "../schema.js";

const storySpec = (
  id: string,
  title: string,
  people: string,
  company: string,
  event: string,
  alternative: string,
): DiagramSpec => ({
  schemaVersion: "1.0",
  id,
  title,
  summary: "Illustrative relationships among fictional people, organizations and events.",
  layout: "vertical",
  topic: "business",
  illustrative: true,
  nodes: [
    { id: "editor", kind: "person", label: "Research editor", role: "Editorial context", tone: "violet" },
    { id: "company", kind: "organization", label: company, meta: "Fictional organization", tone: "sand" },
    { id: "leader", kind: "person", label: people, role: "Operations lead", tone: "sky" },
    { id: "event", kind: "launch", label: event, meta: "Illustrative event", tone: "peach" },
    { id: "outcome", kind: "business", label: "A changing business story", tone: "mint" },
    { id: "other", kind: "document", label: alternative, meta: "Context to keep in view", tone: "rose" },
  ],
  edges: [
        { id: "e-company-leader", from: "company", to: "leader", label: "employs" },
    { id: "e-leader-event", from: "leader", to: "event", label: "announces" },
    { id: "e-editor-event", from: "editor", to: "event", label: "follows" },
    { id: "e-event-outcome", from: "event", to: "outcome", label: "may influence" },
    { id: "e-event-other", from: "event", to: "other", label: "also raises" },
  ],
  annotations: [
    { id: "story-note", kind: "info", text: "Fictional example; the connection is a reading prompt, not a reported fact.", target: "event" },
  ],
  animation: {
    preset: "decision-branch",
    loop: false,
    steps: [
      { caption: "Start with the fictional organization and the people around the story.", nodes: ["company", "leader", "editor"], edges: ["e-company-leader"] },
      { caption: "A made-up announcement creates two possible areas of attention.", nodes: ["company", "leader", "editor", "event", "outcome", "other"], edges: ["e-company-leader", "e-leader-event", "e-editor-event", "e-event-outcome", "e-event-other"], branch: { from: "event", take: "e-event-outcome" }, annotate: ["story-note"] },
    ],
  },
});

const timelineSpec = (id: string, title: string, entries: readonly [string, string, string][]): DiagramSpec => ({
  schemaVersion: "1.0",
  id,
  title,
  summary: "A fictional sequence of sample events for reading the story in context.",
  layout: "vertical",
  topic: "general",
  illustrative: true,
  nodes: entries.map(([idSuffix, label, meta]) => ({ id: idSuffix, kind: "timeline", label, meta, tone: "sand" })),
  edges: entries.slice(1).map((entry, index) => ({ id: `e-${entries[index]![0]}-${entry[0]}`, from: entries[index]![0], to: entry[0], label: "then" })),
  annotations: entries.slice(0, 2).map(([idSuffix], index) => ({ id: `event-note-${index + 1}`, kind: "label" as const, text: index === 0 ? "Illustrative starting point" : "Sample development" , target: idSuffix })),
  animation: {
    preset: "timeline",
    loop: false,
    steps: [
      { caption: "Read the fictional milestones in order.", nodes: entries.map(([entryId]) => entryId), edges: entries.slice(1).map((entry, index) => `e-${entries[index]![0]}-${entry[0]}`), annotate: ["event-note-1", "event-note-2"] },
    ],
  },
});

export const REPORT_DIAGRAM_SPECS = {
  daily: {
    story: storySpec("report-daily-story", "A story taking shape", "Product lead", "Luma Labs", "A pilot moves into review", "Partner feedback"),
    timeline: timelineSpec("report-daily-timeline", "Today in the sample story", [["morning", "Early day", "Planning note"], ["midday", "Midday", "Fictional pilot review"], ["later", "Later", "Questions remain open"]]),
  },
  weekly: {
    story: storySpec("report-weekly-story", "Signals across a week", "Supply lead", "Terra Foods", "A sourcing plan is revised", "Seasonal demand"),
    timeline: timelineSpec("report-weekly-timeline", "A sample week", [["week-start", "Week begins", "Fictional planning note"], ["midweek", "Midweek", "Sample sourcing update"], ["week-end", "Week closes", "Open follow-up"]]),
  },
  monthly: {
    story: storySpec("report-monthly-story", "A month of small shifts", "Grid planner", "Nova Grid", "A storage proposal is discussed", "Local demand"),
    timeline: timelineSpec("report-monthly-timeline", "A sample month", [["early-month", "Early month", "Fictional proposal"], ["mid-month", "Mid month", "Sample community review"], ["late-month", "Late month", "Decision still open"]]),
  },
  yearly: {
    story: storySpec("report-yearly-story", "The year behind the headlines", "Research lead", "Luma Labs", "Teams reconsider rollout plans", "Customer questions"),
    timeline: timelineSpec("report-yearly-timeline", "A sample year", [["first-season", "First season", "Fictional planning"], ["middle-season", "Middle season", "Sample pilot"], ["final-season", "Final season", "Open questions"]]),
    themes: {
      schemaVersion: "1.0",
      id: "report-yearly-themes",
      title: "Year in themes",
      summary: "Three fictional themes connected by questions of trust and implementation.",
      layout: "vertical",
      topic: "business",
      illustrative: true,
      groups: [
        { id: "theme-practice", label: "Everyday practice", kind: "section", collapsible: true, collapsed: true },
        { id: "theme-trust", label: "Trust and care", kind: "section", collapsible: true, collapsed: true },
      ],
      nodes: [
        { id: "theme-tools", kind: "technology", label: "Tools enter routines", group: "theme-practice", tone: "violet" },
        { id: "theme-skills", kind: "learning", label: "Teams build skills", group: "theme-practice", tone: "sky" },
        { id: "theme-questions", kind: "person", label: "People ask who benefits", group: "theme-trust", tone: "peach" },
        { id: "theme-guardrails", kind: "business", label: "Organizations set guardrails", group: "theme-trust", tone: "mint" },
      ],
      edges: [
        { id: "e-tools-skills", from: "theme-tools", to: "theme-skills", label: "changes work" },
        { id: "e-questions-guardrails", from: "theme-questions", to: "theme-guardrails", label: "prompts review" },
        { id: "e-skills-guardrails", from: "theme-skills", to: "theme-guardrails", label: "informs practice" },
      ],
      annotations: [{ id: "themes-note", kind: "info", text: "These themes are fictional prompts, not measured trends.", target: "theme-tools" }],
      animation: {
        preset: "expand",
        loop: false,
        steps: [
          { caption: "Open the everyday-practice theme.", expand: ["theme-practice"], annotate: ["themes-note"] },
          { caption: "Connect practice to trust and organizational care.", expand: ["theme-trust"], collapse: ["theme-practice"], highlight: ["e-skills-guardrails"] },
        ],
      },
    },
  },
} satisfies Record<string, { story: DiagramSpec; timeline: DiagramSpec; themes?: DiagramSpec }>;
