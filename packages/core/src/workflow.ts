export type WorkflowNodeStatus = "pending" | "running" | "retrying" | "complete" | "failed";

export interface WorkflowNode<TInput = unknown, TOutput = unknown> {
  id: string;
  run(input: TInput): Promise<TOutput>;
  retry?: {
    maxAttempts: number;
    backoffMs: number;
  };
}

export interface WorkflowExecutionState {
  nodeId: string;
  status: WorkflowNodeStatus;
  attempts: number;
  output?: unknown;
  error?: string;
}

export interface Workflow {
  id: string;
  nodes: WorkflowNode[];
  start(input: unknown): Promise<void>;
  getState(): WorkflowExecutionState[];
}
