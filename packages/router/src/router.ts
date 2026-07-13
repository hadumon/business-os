import type {
  AgentDefinition,
  Router as RouterInterface,
  RouteIntent,
  ExecutionPlan,
} from "@business-os/core";
import type { IntentDetector } from "./intent-detector.js";

export interface AgentIntentBinding {
  agentId: string;
  intents: string[];
}

export class Router implements RouterInterface {
  private agents = new Map<string, AgentDefinition>();
  private intentBindings = new Map<string, string[]>(); // intent -> agentIds

  constructor(private intentDetector: IntentDetector) {}

  registerAgent(agent: AgentDefinition, intents: string[] = [agent.id]): void {
    this.agents.set(agent.id, agent);
    for (const intent of intents) {
      const existing = this.intentBindings.get(intent) ?? [];
      existing.push(agent.id);
      this.intentBindings.set(intent, existing);
    }
  }

  async route(input: string): Promise<RouteIntent> {
    const availableIntents = Array.from(this.intentBindings.keys());
    return this.intentDetector.detect(input, availableIntents);
  }

  async plan(intent: RouteIntent): Promise<ExecutionPlan> {
    if (!intent.detectedIntent) {
      return { agents: [], reasoning: "No matching intent found" };
    }

    const agentIds = this.intentBindings.get(intent.detectedIntent) ?? [];

    return {
      agents: agentIds,
      reasoning: `Matched intent "${intent.detectedIntent}" with confidence ${intent.confidence ?? 0}`,
    };
  }

  getRegisteredAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }
}
