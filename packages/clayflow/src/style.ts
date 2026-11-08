import { MOTION_CSS } from "./motion/tokens.js";
import { BASE_STYLE } from "./style/base.js";
import { MOTION_NODES_STYLE } from "./style/motion-nodes.js";
import { MOTION_EDGES_STYLE } from "./style/motion-edges.js";
import { MOTION_GROUPS_STYLE } from "./style/motion-groups.js";
import { INSPECT_STYLE } from "./style/inspect.js";

export const CLAYFLOW_STYLE = [MOTION_CSS, BASE_STYLE, MOTION_NODES_STYLE, MOTION_EDGES_STYLE, MOTION_GROUPS_STYLE, INSPECT_STYLE].join("\n");
