import { z } from "zod";
import type { AgentContext, AgentResult } from "@business-os/core";
import { createConsoleLogger, type Logger } from "./logger.js";
import { AgentValidationError, AgentExecutionError } from "./error.js";

export interface DefineAgentConfig<
  TInputSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny = z.ZodTypeAny
> {
  id: string;
  description?: string;
  inputSchema?: TInputSchema;
  outputSchema?: TOutputSchema;
  execute(
    ctx: AgentContext & { input: z.infer<TInputSchema>; logger: Logger }
  ): Promise<z.infer<TOutputSchema>> | z.infer<TOutputSchema>;
}

export interface RegisteredAgent {
  id: string;
  description?: string | undefined;
  run(ctx: AgentContext): Promise<AgentResult>;
}

const registry = new Map<string, RegisteredAgent>();

export function defineAgent<
  TInputSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny = z.ZodTypeAny
>(config: DefineAgentConfig<TInputSchema, TOutputSchema>): RegisteredAgent {
  const { id, description, inputSchema, outputSchema, execute } = config;

  if (!id || typeof id !== "string") {
    throw new AgentValidationError(id ?? "unknown", "Agent id must be a non-empty string");
  }

  const logger = createConsoleLogger(id);

  const agent: RegisteredAgent = {
    id,
    description,
    async run(ctx: AgentContext): Promise<AgentResult> {
      logger.info("Agent execution started");

      let validatedInput: unknown = ctx.input;
      if (inputSchema) {
        const parsed = inputSchema.safeParse(ctx.input);
        if (!parsed.success) {
          logger.error("Input validation failed", { issues: parsed.error.issues });
          return { success: false, error: parsed.error.message };
        }
        validatedInput = parsed.data;
      }

      try {
        const rawOutput = await execute({
          ...ctx,
          input: validatedInput as z.infer<TInputSchema>,
          logger,
        });

        let finalOutput: unknown = rawOutput;
        if (outputSchema) {
          const parsedOutput = outputSchema.safeParse(rawOutput);
          if (!parsedOutput.success) {
            logger.error("Output validation failed", { issues: parsedOutput.error.issues });
            return { success: false, error: parsedOutput.error.message };
          }
          finalOutput = parsedOutput.data;
        }

        logger.info("Agent execution completed");
        return { success: true, output: finalOutput };
      } catch (err) {
        logger.error("Agent execution threw an error", { err });
        const wrapped = new AgentExecutionError(id, err);
        return { success: false, error: wrapped.message };
      }
    },
  };

  if (registry.has(id)) {
    throw new AgentValidationError(id, `Agent with id "${id}" is already registered`);
  }
  registry.set(id, agent);

  return agent;
}

export function getRegisteredAgent(id: string): RegisteredAgent | undefined {
  return registry.get(id);
}

export function listRegisteredAgents(): RegisteredAgent[] {
  return Array.from(registry.values());
}

// Exposed for tests only — clears the module-level registry.
export function __resetRegistry(): void {
  registry.clear();
}