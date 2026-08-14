import { Agent } from "./agent.js";
import { estimateTool, knowledgeSearchTool } from "./tools.js";
import type { Planner } from "./types.js";

const planner: Planner = async ({ step, observations }) => {
  if (step === 1) return { kind: "tool", tool: "knowledge.search", input: { query: "AI agent" } };
  if (step === 2) return { kind: "tool", tool: "delivery.estimate", input: { tasks: 6, integrations: 2 } };
  return {
    kind: "finish",
    answer: `Plan prepared from ${observations.length} verified tool results.`,
  };
};

const agent = new Agent({ planner, tools: [knowledgeSearchTool, estimateTool] });
const result = await agent.run("Prepare a safe AI-agent MVP plan");
console.log(JSON.stringify(result, null, 2));
