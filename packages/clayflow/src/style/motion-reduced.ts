// Reduced motion: no movement, final state only. The same rules apply for the OS setting and for the
// `.force-reduced` class on <html> (the gallery/showcase toggle), so both paths stay identical.
// Pseudo-elements on descendants are listed explicitly because `*` does not match ::before/::after
// (the thinking glow/orbit and reservoir fill live on .cf-well::before/::after).
const STILLED = [
  ".cf-node", ".cf-node *", ".cf-node::before", ".cf-node::after", ".cf-node *::before", ".cf-node *::after",
  ".cf-group", ".cf-group *", ".cf-group-tab", ".cf-group-section",
];

const finalState = (p: string) => `${STILLED.map((s) => p + s).join(",")}{animation:none!important;transition:none!important}
${p}.cf-group,${p}.cf-group-tab,${p}.cf-group-section{transform:none!important}
${p}.cf-group.is-expanded{opacity:1}
${p}.cf-group.is-collapsed{opacity:.62}
${p}.cf-node[data-motion="reservoir"][data-state="success"] .cf-well::before{transform:scaleY(.72)}
${p}.cf-node[data-motion="thinking"] .cf-well::before{display:none}
${p}.cf-node[data-motion="coins"][data-state="active"] .cf-well::before{opacity:1;transform:none}
${p}.cf-node[data-motion="goal"][data-state="success"] .cf-well::after{opacity:1;transform:none}
${p}.cf-node[data-motion="launch"][data-state="success"] .cf-well::before{opacity:.25}`;

export const MOTION_REDUCED_STYLE = `@media (prefers-reduced-motion: reduce) {
${finalState("")}
}
${finalState(".force-reduced ")}
`;
