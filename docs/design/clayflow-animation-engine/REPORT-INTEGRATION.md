# Manthan Reports integration

The playground's `/reports` route composes `@arsenal/clayflow/react` diagrams with the Manthan clay tokens from stock-kit. The reader starts on the monthly sample and switches among daily, weekly, monthly and yearly views. Its report copy lives in `apps/playground/app/reports/sample-reports.ts`; every story is explicitly fictional and the page carries a persistent “Sample report — not real news” notice.

Diagram definitions are kept as reusable examples in `packages/clayflow/src/examples/report-specs.ts`. The examples use only current schema fields and set `illustrative: true`. Story diagrams connect fictional people, organizations, announcements and business outcomes through labelled edges, with a branch and an explanatory annotation. Timeline diagrams use timeline nodes and annotation chips. The annual theme diagram groups nodes into collapsible sections and demonstrates `expand` and `collapse` steps.

The route imports stock-kit and ClayFlow styles and supplies report-specific ClayFlow variables from `.manthan-clay`, so diagrams follow the host theme including `ivory-graphite`. The four-period control animates its thumb and the content fades between views; reduced-motion preferences remove those transitions. The report diagrams use vertical layout to remain readable in narrow viewports.

`packages/clayflow/src/examples/report-specs.test.ts` validates every report diagram and confirms bounded compiled frames, illustrative flags and use of annotation, branching or group steps.
