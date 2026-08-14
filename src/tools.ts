import type { JsonObject, Tool } from "./types.js";

const requireString = (input: JsonObject, key: string): string => {
  const value = input[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${key} must be a non-empty string`);
  return value.trim();
};

export const knowledgeSearchTool: Tool = {
  name: "knowledge.search",
  description: "Searches a small in-memory product knowledge base.",
  validate(input) {
    requireString(input, "query");
  },
  async execute(input, context) {
    if (context.signal.aborted) throw new Error("Request aborted");
    const query = requireString(input, "query").toLowerCase();
    const articles = [
      { title: "MVP", body: "Start with one measurable user scenario and a fixed acceptance criterion." },
      { title: "AI agent", body: "Use an allow-list of tools, step limits and an audit log for every action." },
      { title: "WebView", body: "Allow only trusted hosts and open external links outside the application." },
    ];
    return { matches: articles.filter((article) => `${article.title} ${article.body}`.toLowerCase().includes(query)) };
  },
};

export const estimateTool: Tool = {
  name: "delivery.estimate",
  description: "Produces a transparent delivery range from task and integration counts.",
  validate(input) {
    if (!Number.isInteger(input.tasks) || Number(input.tasks) < 1) throw new Error("tasks must be a positive integer");
    if (!Number.isInteger(input.integrations) || Number(input.integrations) < 0) throw new Error("integrations must be a non-negative integer");
  },
  async execute(input) {
    const tasks = Number(input.tasks);
    const integrations = Number(input.integrations);
    const minimumDays = Math.max(2, Math.ceil(tasks / 3) + integrations * 2);
    return { minimumDays, maximumDays: minimumDays + Math.max(2, integrations) };
  },
};
