export type NodeStatus = "pending" | "running" | "retrying" | "complete" | "failed";

export interface NodeRetryConfig {
  maxAttempts: number;
  backoffMs: number;
}

export interface WorkflowNodeDefinition<TInput = unknown, TOutput = unknown> {
  id: string;
  /** Explicit downstream node ids. Omit to fall back to array order (linear mode). */
  next?: string[];
  retry?: NodeRetryConfig;
  run(input: TInput): Promise<TOutput> | TOutput;
}

export interface NodeExecutionState {
  nodeId: string;
  status: NodeStatus;
  attempts: number;
  output?: unknown;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}
