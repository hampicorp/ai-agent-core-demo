import { randomUUID } from "node:crypto";
import type { AgentEvent, AgentResult, JsonObject, Planner, Tool } from "./types.js";

export type AgentOptions = {
  readonly planner: Planner;
  readonly tools: readonly Tool[];
  readonly maxSteps?: number;
  readonly timeoutMs?: number;
  readonly allowedTools?: readonly string[];
};

/**
 * Coordinates planning, policy checks, tool execution and an immutable audit log.
 * Model/API integration stays behind Planner, so orchestration is deterministic in tests.
 */
export class Agent {
  readonly #planner: Planner;
  readonly #tools: ReadonlyMap<string, Tool>;
  readonly #maxSteps: number;
  readonly #timeoutMs: number;
  readonly #allowedTools: ReadonlySet<string>;

  constructor(options: AgentOptions) {
    this.#planner = options.planner;
    this.#maxSteps = options.maxSteps ?? 6;
    this.#timeoutMs = options.timeoutMs ?? 5_000;
    this.#tools = new Map(options.tools.map((tool) => [tool.name, tool]));
    this.#allowedTools = new Set(options.allowedTools ?? options.tools.map((tool) => tool.name));

    if (this.#maxSteps < 1) throw new Error("maxSteps must be positive");
    if (this.#tools.size !== options.tools.length) throw new Error("Tool names must be unique");
  }

  async run(goal: string): Promise<AgentResult> {
    const normalizedGoal = goal.trim();
    if (!normalizedGoal) throw new Error("Goal must not be empty");

    const requestId = randomUUID();
    const observations: JsonObject[] = [];
    const events: AgentEvent[] = [
      { type: "agent.started", requestId, goal: normalizedGoal },
    ];

    for (let step = 1; step <= this.#maxSteps; step += 1) {
      const action = await this.#planner({
        goal: normalizedGoal,
        step,
        observations,
        availableTools: [...this.#tools.values()].map(({ name, description }) => ({ name, description })),
      });

      if (action.kind === "finish") {
        const answer = action.answer.trim();
        if (!answer) throw new Error("Planner returned an empty answer");
        events.push({ type: "agent.completed", steps: step - 1, answer });
        return { answer, steps: step - 1, events };
      }

      const tool = this.#tools.get(action.tool);
      if (!tool) return this.#failure(events, `Unknown tool: ${action.tool}`);
      if (!this.#allowedTools.has(tool.name)) return this.#failure(events, `Tool is not allowed: ${tool.name}`);

      tool.validate(action.input);
      events.push({ type: "tool.started", step, tool: tool.name });

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
      try {
        const output = await tool.execute(action.input, { requestId, signal: controller.signal });
        observations.push(output);
        events.push({ type: "tool.completed", step, tool: tool.name, output });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Tool failed";
        return this.#failure(events, `${tool.name}: ${reason}`);
      } finally {
        clearTimeout(timer);
      }
    }

    return this.#failure(events, `Step limit exceeded (${this.#maxSteps})`);
  }

  #failure(events: AgentEvent[], reason: string): never {
    events.push({ type: "agent.failed", reason });
    const error = new Error(reason);
    Object.assign(error, { events });
    throw error;
  }
}
