import assert from "node:assert/strict";
import test from "node:test";
import { Agent } from "../src/agent.js";
import type { Planner, Tool } from "../src/types.js";

const echo: Tool = {
  name: "echo",
  description: "Returns its input",
  validate(input) {
    if (typeof input.message !== "string") throw new Error("message is required");
  },
  async execute(input) {
    return { message: input.message };
  },
};

test("executes an allowed tool and returns an audit log", async () => {
  const planner: Planner = async ({ step, observations }) =>
    step === 1
      ? { kind: "tool", tool: "echo", input: { message: "verified" } }
      : { kind: "finish", answer: String(observations[0]?.message) };

  const result = await new Agent({ planner, tools: [echo] }).run("test goal");
  assert.equal(result.answer, "verified");
  assert.equal(result.steps, 1);
  assert.deepEqual(result.events.map((event) => event.type), [
    "agent.started",
    "tool.started",
    "tool.completed",
    "agent.completed",
  ]);
});

test("blocks a tool outside the allow-list", async () => {
  const planner: Planner = async () => ({ kind: "tool", tool: "echo", input: { message: "no" } });
  const agent = new Agent({ planner, tools: [echo], allowedTools: [] });
  await assert.rejects(() => agent.run("test goal"), /Tool is not allowed/);
});

test("stops an agent that exceeds the step limit", async () => {
  const planner: Planner = async () => ({ kind: "tool", tool: "echo", input: { message: "again" } });
  const agent = new Agent({ planner, tools: [echo], maxSteps: 2 });
  await assert.rejects(() => agent.run("test goal"), /Step limit exceeded/);
});
