# Stock Intelligence integration

The stock dashboard composes the existing stock-kit components into a responsive research view: the Manthan rail, market hero and index tiles, sample picks, the sample price chart with a trade plan, market glance, portfolio, mood gauge, stock rationale and investor mode switch. ClayFlow art is referenced through each component's optional `assetBase` prop, which defaults to `/assets/clayflow`.

## Data honesty

All displayed market values, chart candles, portfolio values, mood and stock rationale come from `apps/playground/app/stock-intelligence/sample-data.ts`. The symbols LUMA, TERRA and NOVA and their company labels are explicitly samples. The chart renders the sample candle series; optional indicator overlays stay disabled. The visible page label says “Sample data — not live prices or advice”. Verdicts carry both text and color. Research-flow captions use “Example:” and describe generic stages without claiming live feeds, metrics or validation.

## Research flow

`PipelineFlow` retains its exported name and renders a `ClayFlowDiagram` from `@arsenal/clayflow/react`. Its schema-valid finance-topic spec has five nodes in order: Market News, Financial Data, Analysis & AI, Risk Check and Stock Pick. Five `animation.steps` progressively reveal the nodes and edges, send packets along the connecting edges, show a plain-English example caption for each stage and set the final pick node to `success`. The surrounding copy identifies the flow as illustrative and clarifies that it is not connected to live research.

The spec uses only fields in the current ClayFlow schema. `DashboardComponents.test.ts` validates it through `validate()` and checks the stage order and final state.
