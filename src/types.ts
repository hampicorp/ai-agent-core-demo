export type JsonObject = Record<string, unknown>;

export type ToolContext = {
  readonly requestId: string;
  readonly signal: AbortSignal;
};

export type Tool = {
  readonly name: string;
  readonly description: string;
  validate(input: JsonObject): void;
  execute(input: JsonObject, context: ToolContext): Promise<JsonObject>;
};

export type PlannedAction =
  | { readonly kind: "tool"; readonly tool: string; readonly input: JsonObject }
  | { readonly kind: "finish"; readonly answer: string };

export type PlannerContext = {
  readonly goal: string;
  readonly step: number;
  readonly observations: readonly JsonObject[];
  readonly availableTools: readonly Pick<Tool, "name" | "description">[];
};

export type Planner = (context: PlannerContext) => Promise<PlannedAction>;

export type AgentEvent =
  | { readonly type: "agent.started"; readonly requestId: string; readonly goal: string }
  | { readonly type: "tool.started"; readonly step: number; readonly tool: string }
  | { readonly type: "tool.completed"; readonly step: number; readonly tool: string; readonly output: JsonObject }
  | { readonly type: "agent.completed"; readonly steps: number; readonly answer: string }
  | { readonly type: "agent.failed"; readonly reason: string };

export type AgentResult = {
  readonly answer: string;
  readonly steps: number;
  readonly events: readonly AgentEvent[];
};
