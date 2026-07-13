import { describe, it, expect, vi } from "vitest";
import { Workflow } from "./workflow.js";
import type { WorkflowNodeDefinition } from "./node.js";

describe("Workflow", () => {
  it("runs nodes linearly, passing output to the next node's input", async () => {
    const nodes: WorkflowNodeDefinition[] = [
      { id: "double", run: (input: number) => input * 2 },
      { id: "addOne", run: (input: number) => input + 1 },
    ];
    const workflow = new Workflow("test-linear", nodes);

    await workflow.start(5);

    const state = workflow.getState();
    expect(state[0]!.status).toBe("complete");
    expect(state[1]!.status).toBe("complete");
    expect(state[1]!.output).toBe(11); // (5*2)+1
  });

  it("retries a failing node up to maxAttempts, then succeeds", async () => {
    let attempts = 0;
    const nodes: WorkflowNodeDefinition[] = [
      {
        id: "flaky",
        retry: { maxAttempts: 3, backoffMs: 0 },
        run: () => {
          attempts++;
          if (attempts < 3) throw new Error("temporary failure");
          return "ok";
        },
      },
    ];
    const workflow = new Workflow("test-retry", nodes);

    await workflow.start(null);

    const state = workflow.getState();
    expect(state[0]!.status).toBe("complete");
    expect(state[0]!.attempts).toBe(3);
  });

  it("marks workflow as failed when a node exhausts retries", async () => {
    const nodes: WorkflowNodeDefinition[] = [
      {
        id: "always-fails",
        retry: { maxAttempts: 2, backoffMs: 0 },
        run: () => {
          throw new Error("permanent failure");
        },
      },
    ];
    const workflow = new Workflow("test-fail", nodes);
    const onFailed = vi.fn();
    workflow.events.on("workflow.failed", onFailed);

    await workflow.start(null);

    const state = workflow.getState();
    expect(state[0]!.status).toBe("failed");
    expect(onFailed).toHaveBeenCalledOnce();
  });

  it("emits node.started and node.completed events in order", async () => {
    const nodes: WorkflowNodeDefinition[] = [{ id: "single", run: () => "done" }];
    const workflow = new Workflow("test-events", nodes);

    const seen: string[] = [];
    workflow.events.on("node.started", () => {
      seen.push("started");
    });
    workflow.events.on("node.completed", () => {
      seen.push("completed");
    });

    await workflow.start(null);

    expect(seen).toEqual(["started", "completed"]);
  });
});
