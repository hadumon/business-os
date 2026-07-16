export class AgentValidationError extends Error {
  constructor(agentId: string, cause: unknown) {
    super(`Validation failed for agent "${agentId}"`);
    this.name = "AgentValidationError";
    this.cause = cause;
  }
}

export class AgentExecutionError extends Error {
  constructor(agentId: string, cause: unknown) {
    const causeMsg = cause instanceof Error ? cause.message : String(cause);
    super(`Execution failed for agent "${agentId}": ${causeMsg}`);
    this.name = "AgentExecutionError";
    this.cause = cause;
  }
}
