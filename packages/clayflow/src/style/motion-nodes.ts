/** Node-specific motion and inspection states owned by the node workstream. */
export const MOTION_NODES_STYLE = `
.cf-node.is-focus { outline: 2px solid var(--cf-accent); outline-offset: 3px; }
.cf-node.is-focus-dim { opacity: .35; }
.cf-node.is-dimmed { opacity: .42; }
.cf-node.is-transforming { transition-duration: var(--cf-dur-transform); }
`;
