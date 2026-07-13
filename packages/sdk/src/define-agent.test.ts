import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import { defineAgent, __resetRegistry } from "./define-agent.js";
import type { AgentContext } from "@business-os/core";

const mockCtx = (input: unknown): AgentContext => ({
  memory: {} as never,
  artifacts: {} as never,
  events: {} as never,
  input: input as Record<string, unknown>,
});

describe("defineAgent", () => {
  beforeEach(() => {
    __resetRegistry();
  });

  it("validates input and returns success with valid data", async () => {
    const agent = defineAgent({
      id: "hello-world",
      inputSchema: z.object({ name: z.string() }),
      outputSchema: z.object({ greeting: z.string() }),
      execute: async (ctx) => ({ greeting: `Hello, ${ctx.input.name}!` }),
    });

    const result = await agent.run(mockCtx({ name: "Claude" }));

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ greeting: "Hello, Claude!" });
  });

  it("fails gracefully on invalid input", async () => {
    const agent = defineAgent({
      id: "strict-agent",
      inputSchema: z.object({ age: z.number() }),
      execute: async () => ({ ok: true }),
    });

    const result = await agent.run(mockCtx({ age: "not-a-number" }));

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("throws when registering a duplicate agent id", () => {
    defineAgent({ id: "dup", execute: async () => ({}) });
    expect(() => defineAgent({ id: "dup", execute: async () => ({}) })).toThrow();
  });
});
