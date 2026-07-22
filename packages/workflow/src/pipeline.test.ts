import { describe, it, expect } from "vitest";
import { Pipeline } from "./pipeline.js";
import type { PipelineDefinition, PipelineExecutor } from "./pipeline.js";
import { SimpleEventEmitter } from "./events.js";
import type { AgentResult } from "@business-os/core";

function makeExecutor(
  results: Record<string, AgentResult>,
): PipelineExecutor & { calls: Array<{ agentId: string; input: Record<string, unknown> }> } {
  const calls: Array<{ agentId: string; input: Record<string, unknown> }> = [];
  return {
    calls,
    async execute(agentId: string, input: Record<string, unknown>): Promise<AgentResult> {
      calls.push({ agentId, input });
      return results[agentId] ?? { success: false, error: `no mock for ${agentId}` };
    },
  };
}

describe("Pipeline", () => {
  it("runs steps in order, passing results forward", async () => {
    const def: PipelineDefinition = {
      id: "test-linear",
      description: "test",
      steps: [
        {
          agentId: "step-a",
          inputBuilder: (_prev, pInput) => ({ project: pInput.project }),
          artifactExtractor: (r) => (r.output as { artifactId: string })?.artifactId,
        },
        {
          agentId: "step-b",
          inputBuilder: (_prev, pInput, artifacts) => ({
            project: pInput.project,
            from: artifacts["step-a"],
          }),
        },
      ],
    };

    const executor = makeExecutor({
      "step-a": { success: true, output: { artifactId: "art-001" } },
      "step-b": { success: true, output: { done: true } },
    });

    const events = new SimpleEventEmitter();
    const pipeline = new Pipeline(def, events);
    const result = await pipeline.run(executor, { project: "test" });

    expect(result.success).toBe(true);
    expect(result.completedSteps).toEqual(["step-a", "step-b"]);
    expect(result.artifacts).toEqual({ "step-a": "art-001" });
    expect(executor.calls).toHaveLength(2);
    expect(executor.calls[0]!.input).toEqual({ project: "test" });
    expect(executor.calls[1]!.input).toEqual({ project: "test", from: "art-001" });
  });

  it("stops on first failure and reports failedStep", async () => {
    const def: PipelineDefinition = {
      id: "test-fail",
      description: "test",
      steps: [
        {
          agentId: "ok-step",
          inputBuilder: (_prev, pInput) => ({ project: pInput.project }),
        },
        {
          agentId: "bad-step",
          inputBuilder: (_prev, pInput) => ({ project: pInput.project }),
        },
        {
          agentId: "never-reached",
          inputBuilder: (_prev, pInput) => ({ project: pInput.project }),
        },
      ],
    };

    const executor = makeExecutor({
      "ok-step": { success: true, output: {} },
      "bad-step": { success: false, error: "something broke" },
      "never-reached": { success: true, output: {} },
    });

    const events = new SimpleEventEmitter();
    const pipeline = new Pipeline(def, events);
    const result = await pipeline.run(executor, { project: "test" });

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe("bad-step");
    expect(result.error).toBe("something broke");
    expect(result.completedSteps).toEqual(["ok-step"]);
    // The third step should never have been called
    expect(executor.calls).toHaveLength(2);
  });

  it("collects artifact ids from all steps that have extractors", async () => {
    const def: PipelineDefinition = {
      id: "test-artifacts",
      description: "test",
      steps: [
        {
          agentId: "alpha",
          inputBuilder: () => ({}),
          artifactExtractor: (r) => (r.output as { id: string })?.id,
        },
        {
          agentId: "beta",
          inputBuilder: () => ({}),
          // no extractor
        },
        {
          agentId: "gamma",
          inputBuilder: () => ({}),
          artifactExtractor: (r) => (r.output as { id: string })?.id,
        },
      ],
    };

    const executor = makeExecutor({
      alpha: { success: true, output: { id: "a-001" } },
      beta: { success: true, output: {} },
      gamma: { success: true, output: { id: "g-001" } },
    });

    const events = new SimpleEventEmitter();
    const pipeline = new Pipeline(def, events);
    const result = await pipeline.run(executor, {});

    expect(result.artifacts).toEqual({ alpha: "a-001", gamma: "g-001" });
  });

  it("emits pipeline events in correct order", async () => {
    const def: PipelineDefinition = {
      id: "test-events",
      description: "test",
      steps: [
        { agentId: "only-step", inputBuilder: () => ({}) },
      ],
    };

    const executor = makeExecutor({
      "only-step": { success: true, output: {} },
    });

    const events = new SimpleEventEmitter();
    const seen: string[] = [];
    events.on("pipeline.started", () => { seen.push("pipeline.started"); });
    events.on("pipeline.step.started", () => { seen.push("pipeline.step.started"); });
    events.on("pipeline.step.completed", () => { seen.push("pipeline.step.completed"); });
    events.on("pipeline.completed", () => { seen.push("pipeline.completed"); });

    const pipeline = new Pipeline(def, events);
    await pipeline.run(executor, {});

    expect(seen).toEqual([
      "pipeline.started",
      "pipeline.step.started",
      "pipeline.step.completed",
      "pipeline.completed",
    ]);
  });

  it("emits pipeline.step.failed and pipeline.failed on failure", async () => {
    const def: PipelineDefinition = {
      id: "test-fail-events",
      description: "test",
      steps: [
        { agentId: "fail-step", inputBuilder: () => ({}) },
      ],
    };

    const executor = makeExecutor({
      "fail-step": { success: false, error: "boom" },
    });

    const events = new SimpleEventEmitter();
    const seen: string[] = [];
    events.on("pipeline.started", () => { seen.push("pipeline.started"); });
    events.on("pipeline.step.started", () => { seen.push("pipeline.step.started"); });
    events.on("pipeline.step.failed", () => { seen.push("pipeline.step.failed"); });
    events.on("pipeline.failed", () => { seen.push("pipeline.failed"); });

    const pipeline = new Pipeline(def, events);
    await pipeline.run(executor, {});

    expect(seen).toEqual([
      "pipeline.started",
      "pipeline.step.started",
      "pipeline.step.failed",
      "pipeline.failed",
    ]);
  });

  it("preview() returns agent ids without executing", () => {
    const def: PipelineDefinition = {
      id: "test-preview",
      description: "test",
      steps: [
        { agentId: "a", inputBuilder: () => ({}) },
        { agentId: "b", inputBuilder: () => ({}) },
        { agentId: "c", inputBuilder: () => ({}) },
      ],
    };

    const events = new SimpleEventEmitter();
    const pipeline = new Pipeline(def, events);
    expect(pipeline.preview()).toEqual(["a", "b", "c"]);
  });

  it("stepResults include per-step timing and artifact ids", async () => {
    const def: PipelineDefinition = {
      id: "test-step-results",
      description: "test",
      steps: [
        {
          agentId: "timed",
          inputBuilder: () => ({}),
          artifactExtractor: (r) => (r.output as { artifactId: string })?.artifactId,
        },
      ],
    };

    const executor = makeExecutor({
      timed: { success: true, output: { artifactId: "t-001" } },
    });

    const events = new SimpleEventEmitter();
    const pipeline = new Pipeline(def, events);
    const result = await pipeline.run(executor, {});

    expect(result.stepResults).toHaveLength(1);
    expect(result.stepResults[0]!.agentId).toBe("timed");
    expect(result.stepResults[0]!.artifactId).toBe("t-001");
    expect(result.stepResults[0]!.durationMs).toBeGreaterThanOrEqual(0);
  });
});
