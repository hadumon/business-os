import type { WorkflowNodeDefinition, NodeExecutionState, NodeStatus } from "./node.js";
import type { WorkflowEventType } from "./events.js";
import { SimpleEventEmitter } from "./events.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Workflow {
  readonly id: string;
  private nodeMap = new Map<string, WorkflowNodeDefinition>();
  private orderedIds: string[];
  private state = new Map<string, NodeExecutionState>();
  readonly events = new SimpleEventEmitter();

  constructor(id: string, nodes: WorkflowNodeDefinition[]) {
    this.id = id;
    this.orderedIds = nodes.map((n) => n.id);
    for (const node of nodes) {
      if (this.nodeMap.has(node.id)) {
        throw new Error(`Duplicate workflow node id "${node.id}"`);
      }
      this.nodeMap.set(node.id, node);
      this.state.set(node.id, { nodeId: node.id, status: "pending", attempts: 0 });
    }
  }

  private emitEvent(type: WorkflowEventType, payload: Record<string, unknown>): void {
    this.events.emit({
      id: `${this.id}-${type}-${Date.now()}`,
      type,
      timestamp: Date.now(),
      source: `workflow:${this.id}`,
      payload,
    });
  }

  private setStatus(nodeId: string, status: NodeStatus, patch: Partial<NodeExecutionState> = {}) {
    const current = this.state.get(nodeId)!;
    this.state.set(nodeId, { ...current, status, ...patch });
  }

  /** Determines which nodes follow the given node. Falls back to linear array order. */
  private nextIdsFor(node: WorkflowNodeDefinition): string[] {
    if (node.next) return node.next;
    const idx = this.orderedIds.indexOf(node.id);
    const nextId = this.orderedIds[idx + 1];
    return nextId ? [nextId] : [];
  }

  async start(input: unknown): Promise<void> {
    this.emitEvent("workflow.started", { input });

    let currentInput = input;
    let currentId: string | undefined = this.orderedIds[0];

    while (currentId) {
      const node = this.nodeMap.get(currentId)!;
      const result = await this.runNode(node, currentInput);

      if (!result.success) {
        this.emitEvent("workflow.failed", { nodeId: node.id, error: result.error });
        return;
      }

      currentInput = result.output;
      const nextIds = this.nextIdsFor(node);
      currentId = nextIds[0]; // linear: take the first declared successor
    }

    this.emitEvent("workflow.completed", { output: currentInput });
  }

  private async runNode(
    node: WorkflowNodeDefinition,
    input: unknown,
  ): Promise<{ success: true; output: unknown } | { success: false; error: string }> {
    const maxAttempts = node.retry?.maxAttempts ?? 1;
    const backoffMs = node.retry?.backoffMs ?? 0;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.setStatus(node.id, attempt === 1 ? "running" : "retrying", {
        attempts: attempt,
        startedAt: Date.now(),
      });
      this.emitEvent(attempt === 1 ? "node.started" : "node.retrying", {
        nodeId: node.id,
        attempt,
      });

      try {
        const output = await node.run(input);
        this.setStatus(node.id, "complete", { output, completedAt: Date.now() });
        this.emitEvent("node.completed", { nodeId: node.id, output });
        return { success: true, output };
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts && backoffMs > 0) {
          await delay(backoffMs);
        }
      }
    }

    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    this.setStatus(node.id, "failed", { error: errorMessage, completedAt: Date.now() });
    this.emitEvent("node.failed", { nodeId: node.id, error: errorMessage });
    return { success: false, error: errorMessage };
  }

  getState(): NodeExecutionState[] {
    return this.orderedIds.map((id) => this.state.get(id)!);
  }
}
