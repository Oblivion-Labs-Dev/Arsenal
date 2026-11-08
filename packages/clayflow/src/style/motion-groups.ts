/** Group state motion explains containment and focus without moving the layout. */
export const MOTION_GROUPS_STYLE = `
.cf-group {
  transform-origin: left top;
  transition: opacity var(--cf-dur-group) var(--cf-ease-standard), transform var(--cf-dur-group) var(--cf-ease-standard);
}
.cf-group.is-expanded {
  border-style: solid;
  animation: cf-group-grow var(--cf-dur-group) var(--cf-ease-emphasized) both;
}
.cf-group.is-collapsed {
  opacity: .62;
  animation: cf-group-shrink var(--cf-dur-group) var(--cf-ease-standard) both;
}
.cf-group.is-expanded .cf-group-tab { animation: cf-tab-anchor var(--cf-dur-group) var(--cf-ease-standard) both; }
.cf-group-section { animation: cf-section-arrive var(--cf-dur-group) var(--cf-ease-emphasized) both; }
.cf-group-section.is-expanded { animation-name: cf-section-arrive; }
.cf-group-section.is-collapsed { animation-name: cf-section-leave; }
.cf-stage:has(.cf-node.is-focus) .cf-group { opacity: .35; }

@keyframes cf-group-grow { from { transform: scale(.97); opacity: .72; } to { transform: scale(1); opacity: 1; } }
@keyframes cf-group-shrink { from { transform: scale(1); opacity: 1; } to { transform: scale(.97); opacity: .62; } }
@keyframes cf-tab-anchor { from { transform: translateY(2px); } to { transform: translateY(0); } }
@keyframes cf-section-arrive { from { transform: translateY(4px) scale(.99); opacity: .55; } to { transform: translateY(0) scale(1); opacity: 1; } }
@keyframes cf-section-leave { from { transform: translateY(0) scale(1); opacity: 1; } to { transform: translateY(2px) scale(.99); opacity: .62; } }

`;
