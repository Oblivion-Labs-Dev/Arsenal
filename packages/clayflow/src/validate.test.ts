import { describe, expect, it } from "vitest";
import { fromModelOutput, validate } from "./validate.js";
import { aiAgentRequestExample } from "./examples.js";
import { type DiagramSpec } from "./schema.js";

describe("ClayFlow validate", () => {
  it("validates a well-formed diagram spec", () => {
    const res = validate(aiAgentRequestExample);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.diagram.id).toBe("ai-agent-request");
      expect(res.diagram.nodes.length).toBe(6);
    }
  });

  it("accepts the added node, section, new badge, preset and topic kinds", () => {
    const result = validate({ schemaVersion: "1.0", id: "new-kinds", title: "New Kinds", topic: "education", nodes: [{ id: "student", kind: "education", label: "Learning" }], edges: [], groups: [{ id: "band", label: "Section", kind: "section" }], annotations: [{ id: "badge", target: "student", kind: "new", text: "New" }], animation: { preset: "pulse" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.diagram.topic).toBe("education");
      expect(result.diagram.groups[0]?.kind).toBe("section");
      expect(result.diagram.annotations[0]?.kind).toBe("new");
    }
  });

  it("accepts optional motion and inspection fields and rejects invalid references", () => {
    const valid = { schemaVersion: "1.0", id: "new-fields", title: "New Fields", illustrative: true, nodes: [{ id: "gate", kind: "decision", label: "Gate", role: "Approver", inputs: ["request"], outputs: ["decision"], evidence: "Policy" }, { id: "yes", kind: "success", label: "Yes" }], edges: [{ id: "take", from: "gate", to: "yes", kind: "conditional", condition: "eligible" }], groups: [{ id: "group", label: "Group" }], annotations: [{ id: "note", kind: "info", text: "Note", target: "yes" }], animation: { preset: "loop", steps: [{ caption: "Go", branch: { from: "gate", take: "take" }, transform: [{ node: "yes", label: "Done" }], expand: ["group"], annotate: ["note"], focus: "yes", loop: { edge: "take", times: 2 } }] } };
    expect(validate(valid).ok).toBe(true);
    const invalid = { ...valid, animation: { preset: "loop", steps: [{ caption: "Bad", branch: { from: "yes", take: "take" }, transform: [{ node: "missing" }], expand: ["missing-group"], annotate: ["missing-note"], focus: "missing", loop: { edge: "missing-edge", times: 2 } }] } };
    const result = validate(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain("does not exist");
  });

  describe("enforces architectural safety limits", () => {
    it("rejects over 40 nodes", () => {
      const overNodes: DiagramSpec = {
        ...aiAgentRequestExample,
        nodes: Array.from({ length: 41 }, (_, i) => ({
          id: `node-${i}`,
          kind: "process",
          label: `Node ${i}`,
        })),
        edges: [],
      };
      const res = validate(overNodes);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors.some((e) => e.includes("nodes"))).toBe(true);
      }
    });

    it("rejects over 80 edges", () => {
      const baseNodes = [
        { id: "node-1", kind: "process" as const, label: "Node 1" },
        { id: "node-2", kind: "process" as const, label: "Node 2" },
      ];
      const overEdges = {
        ...aiAgentRequestExample,
        nodes: baseNodes,
        edges: Array.from({ length: 81 }, (_, i) => ({
          id: `edge-${i}`,
          from: "node-1",
          to: "node-2",
        })),
      };
      const res = validate(overEdges);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors.some((e) => e.includes("edges"))).toBe(true);
      }
    });

    it("rejects over 8 groups", () => {
      const overGroups = {
        ...aiAgentRequestExample,
        groups: Array.from({ length: 9 }, (_, i) => ({
          id: `group-${i}`,
          label: `Group ${i}`,
        })),
      };
      const res = validate(overGroups);
      expect(res.ok).toBe(false);
    });

    it("rejects labels longer than 40 characters", () => {
      const longLabel = {
        ...aiAgentRequestExample,
        nodes: [
          {
            id: "node-1",
            kind: "process" as const,
            label: "This label is definitely exceeding the forty characters limit!",
          },
        ],
      };
      const res = validate(longLabel);
      expect(res.ok).toBe(false);
    });

    it("rejects descriptions longer than 160 characters", () => {
      const longSummary = {
        ...aiAgentRequestExample,
        summary: "a".repeat(161),
      };
      const res = validate(longSummary);
      expect(res.ok).toBe(false);
    });

    it("rejects IDs that violate lowercase alphanumeric and hyphen rule", () => {
      const badId = {
        ...aiAgentRequestExample,
        id: "Invalid_ID_With_Capitals!",
      };
      expect(validate(badId).ok).toBe(false);

      const badNodeId = {
        ...aiAgentRequestExample,
        nodes: [{ id: "bad ID", kind: "process" as const, label: "Test" }],
      };
      expect(validate(badNodeId).ok).toBe(false);
    });
  });

  describe("referential integrity checks", () => {
    it("rejects edges with missing source or target nodes", () => {
      const brokenEdge = {
        ...aiAgentRequestExample,
        edges: [{ id: "e-broken", from: "non-existent-1", to: "user" }],
      };
      const res = validate(brokenEdge);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors.some((e) => e.includes("does not exist"))).toBe(true);
      }
    });

    it("rejects self-referential edges", () => {
      const selfEdge = {
        ...aiAgentRequestExample,
        edges: [{ id: "e-self", from: "user", to: "user" }],
      };
      const res = validate(selfEdge);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors.some((e) => e.includes("Self-referential"))).toBe(true);
      }
    });

    it("rejects nodes referencing non-existent groups", () => {
      const brokenGroupRef = {
        ...aiAgentRequestExample,
        nodes: [
          {
            id: "node-1",
            kind: "process" as const,
            label: "Node 1",
            group: "ghost-group",
          },
        ],
      };
      const res = validate(brokenGroupRef);
      expect(res.ok).toBe(false);
    });

    it("rejects cyclic group hierarchies", () => {
      const cycleGroups = {
        ...aiAgentRequestExample,
        groups: [
          { id: "group-a", label: "Group A", parent: "group-b" },
          { id: "group-b", label: "Group B", parent: "group-a" },
        ],
      };
      const res = validate(cycleGroups);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors.some((e) => e.includes("Cycle detected"))).toBe(true);
      }
    });

    it("rejects group nesting depth greater than 3", () => {
      const deepGroups = {
        ...aiAgentRequestExample,
        groups: [
          { id: "g-1", label: "Group 1" },
          { id: "g-2", label: "Group 2", parent: "g-1" },
          { id: "g-3", label: "Group 3", parent: "g-2" },
          { id: "g-4", label: "Group 4", parent: "g-3" },
        ],
      };
      const res = validate(deepGroups);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors.some((e) => e.includes("exceeds maximum nesting depth"))).toBe(true);
      }
    });

    it("rejects annotations referencing non-existent nodes", () => {
      const brokenAnn = {
        ...aiAgentRequestExample,
        annotations: [{ id: "ann-1", kind: "info" as const, text: "Note", target: "ghost-node" }],
      };
      const res = validate(brokenAnn);
      expect(res.ok).toBe(false);
    });
  });

  describe("fallback model generation", () => {
    it("constructs fallback model containing valid nodes when validation fails", () => {
      const invalidSpec = {
        schemaVersion: "1.0",
        id: "invalid-spec",
        title: "Partially Broken Spec",
        nodes: [
          { id: "good-1", kind: "agent", label: "Valid Agent" },
          { id: "good-2", kind: "database", label: "Valid DB" },
          { id: "bad-3", kind: "unknown-kind-xyz", label: "Bad Kind" },
        ],
        edges: [{ id: "e-broken", from: "good-1", to: "missing-target" }],
      };
      const res = validate(invalidSpec);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fallback.title).toBe("Partially Broken Spec");
        expect(res.fallback.nodes.length).toBe(2);
        expect(res.fallback.nodes[0]?.label).toBe("Valid Agent");
        expect(res.fallback.nodes[1]?.label).toBe("Valid DB");
      }
    });
  });

  describe("never throws on arbitrary input", () => {
    it("handles null, undefined, primitives, arrays and corrupted structures", () => {
      expect(() => validate(null)).not.toThrow();
      expect(validate(null).ok).toBe(false);

      expect(() => validate(undefined)).not.toThrow();
      expect(validate(undefined).ok).toBe(false);

      expect(() => validate(42)).not.toThrow();
      expect(validate(42).ok).toBe(false);

      expect(() => validate("not a diagram")).not.toThrow();
      expect(validate("not a diagram").ok).toBe(false);

      expect(() => validate("x".repeat(100000))).not.toThrow();
      expect(validate("x".repeat(100000)).ok).toBe(false);

      expect(() => validate([])).not.toThrow();
      expect(validate([]).ok).toBe(false);

      expect(() => validate({})).not.toThrow();
      expect(validate({}).ok).toBe(false);
    });
  });

  describe("fromModelOutput tolerant LLM adapter", () => {
    it("accepts a raw JSON string", () => {
      const jsonStr = JSON.stringify({
        title: "Model Output Flow",
        nodes: [
          { id: "n1", type: "user", text: "Client" },
          { id: "n2", type: "service", text: "Server" },
        ],
        edges: [{ source: "n1", target: "n2", text: "Call" }],
      });
      const res = fromModelOutput(jsonStr);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.diagram.title).toBe("Model Output Flow");
        expect(res.diagram.nodes[0]?.kind).toBe("user");
        expect(res.diagram.nodes[0]?.label).toBe("Client");
        expect(res.diagram.edges[0]?.from).toBe("n1");
        expect(res.diagram.edges[0]?.to).toBe("n2");
      }
    });

    it("strips markdown code blocks", () => {
      const fenced =
        "```json\n" +
        JSON.stringify({
          title: "Fenced Flow",
          nodes: [
            { id: "n1", kind: "cloud", label: "Cloud Node" },
            { id: "n2", kind: "database", label: "DB Node" },
          ],
          edges: [{ from: "n1", to: "n2" }],
        }) +
        "\n```";

      const res = fromModelOutput(fenced);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.diagram.title).toBe("Fenced Flow");
      }
    });

    it("truncates over-long labels with an ellipsis", () => {
      const longInput = {
        title:
          "A very long diagram title that exceeds the forty characters allowed by the schema specification",
        nodes: [
          {
            id: "n1",
            type: "process",
            name: "Extremely long node label that definitely exceeds forty characters",
          },
        ],
      };
      const res = fromModelOutput(longInput);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.diagram.title.length).toBeLessThanOrEqual(40);
        expect(res.diagram.title.endsWith("...")).toBe(true);
        expect(res.diagram.nodes[0]?.label.length).toBeLessThanOrEqual(40);
        expect(res.diagram.nodes[0]?.label.endsWith("...")).toBe(true);
      }
    });

    it("drops unknown fields without breaking validation", () => {
      const withExtra = {
        title: "Extra Fields Flow",
        unexpectedProperty: "should be ignored",
        nodes: [
          {
            id: "node-1",
            kind: "process",
            label: "Node 1",
            someRandomAiNote: 12345,
          },
        ],
      };
      const res = fromModelOutput(withExtra);
      expect(res.ok).toBe(true);
    });
  });
});
