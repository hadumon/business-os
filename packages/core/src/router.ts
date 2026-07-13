import type { AgentDefinition } from "./agent.js";

export interface RouteIntent {
  raw: string;
  detectedIntent?: string | undefined;
  confidence?: number | undefined;
}

export interface ExecutionPlan {
  agents: AgentDefinition["id"][];
  reasoning?: string;
}

export interface Router {
  registerAgent(agent: AgentDefinition): void;
  route(input: string): Promise<RouteIntent>;
  plan(intent: RouteIntent): Promise<ExecutionPlan>;
}
