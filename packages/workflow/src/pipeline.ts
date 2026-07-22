import type { AgentResult } from "@business-os/core";
import type { SimpleEventEmitter } from "./events.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single step in a multi-agent pipeline.
 *
 * `inputBuilder` receives the previous agent's result (or `undefined` for the
 * first step) plus the top-level pipeline input, and must return the
 * `Record<string, unknown>` that `Runtime.execute()` will forward to the agent.
 *
 * `artifactExtractor` is optional — if provided, the pipeline stores the
 * artifact id it returns so downstream steps can receive it via
 * `inputBuilder`.
 */
export interface PipelineStep {
  agentId: string;
  inputBuilder: (
    prev: AgentResult | undefined,
    pipelineInput: Record<string, unknown>,
    collectedArtifacts: Record<string, string>,
  ) => Record<string, unknown>;
  artifactExtractor?: (result: AgentResult) => string | undefined;
}

export interface PipelineDefinition {
  id: string;
  description: string;
  steps: PipelineStep[];
}

export interface PipelineStepResult {
  agentId: string;
  result: AgentResult;
  artifactId?: string | undefined;
  durationMs: number;
}

export interface PipelineResult {
  success: boolean;
  completedSteps: string[];
  failedStep?: string | undefined;
  error?: string | undefined;
  artifacts: Record<string, string>; // agentId -> artifactId
  stepResults: PipelineStepResult[];
  durationMs: number;
}

export type PipelineEventType =
  | "pipeline.started"
  | "pipeline.step.started"
  | "pipeline.step.completed"
  | "pipeline.step.failed"
  | "pipeline.completed"
  | "pipeline.failed";

// ---------------------------------------------------------------------------
// Executor interface — abstraction over Runtime.execute() so the pipeline
// engine has no direct dependency on the Runtime class.
// ---------------------------------------------------------------------------

export interface PipelineExecutor {
  execute(agentId: string, input: Record<string, unknown>): Promise<AgentResult>;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export class Pipeline {
  readonly definition: PipelineDefinition;
  private events: SimpleEventEmitter;

  constructor(definition: PipelineDefinition, events: SimpleEventEmitter) {
    this.definition = definition;
    this.events = events;
  }

  /** Dry-run: returns the ordered agent ids without executing anything. */
  preview(): string[] {
    return this.definition.steps.map((s) => s.agentId);
  }

  async run(
    executor: PipelineExecutor,
    pipelineInput: Record<string, unknown>,
  ): Promise<PipelineResult> {
    const pipelineStart = Date.now();
    const completedSteps: string[] = [];
    const artifacts: Record<string, string> = {};
    const stepResults: PipelineStepResult[] = [];

    this.emitEvent("pipeline.started", {
      pipelineId: this.definition.id,
      steps: this.definition.steps.map((s) => s.agentId),
    });

    let prevResult: AgentResult | undefined;

    for (const step of this.definition.steps) {
      const stepStart = Date.now();

      this.emitEvent("pipeline.step.started", {
        pipelineId: this.definition.id,
        agentId: step.agentId,
        stepIndex: completedSteps.length,
      });

      const input = step.inputBuilder(prevResult, pipelineInput, artifacts);
      const result = await executor.execute(step.agentId, input);
      const stepDuration = Date.now() - stepStart;

      if (!result.success) {
        const stepResult: PipelineStepResult = {
          agentId: step.agentId,
          result,
          durationMs: stepDuration,
        };
        stepResults.push(stepResult);

        this.emitEvent("pipeline.step.failed", {
          pipelineId: this.definition.id,
          agentId: step.agentId,
          error: result.error,
        });

        this.emitEvent("pipeline.failed", {
          pipelineId: this.definition.id,
          failedStep: step.agentId,
          completedSteps,
          error: result.error,
        });

        return {
          success: false,
          completedSteps,
          failedStep: step.agentId,
          error: result.error,
          artifacts,
          stepResults,
          durationMs: Date.now() - pipelineStart,
        };
      }

      // Extract artifact id if the step defines an extractor
      let artifactId: string | undefined;
      if (step.artifactExtractor) {
        artifactId = step.artifactExtractor(result);
        if (artifactId) {
          artifacts[step.agentId] = artifactId;
        }
      }

      const stepResult: PipelineStepResult = {
        agentId: step.agentId,
        result,
        artifactId,
        durationMs: stepDuration,
      };
      stepResults.push(stepResult);

      this.emitEvent("pipeline.step.completed", {
        pipelineId: this.definition.id,
        agentId: step.agentId,
        artifactId,
        durationMs: stepDuration,
      });

      completedSteps.push(step.agentId);
      prevResult = result;
    }

    this.emitEvent("pipeline.completed", {
      pipelineId: this.definition.id,
      completedSteps,
      artifacts,
      durationMs: Date.now() - pipelineStart,
    });

    return {
      success: true,
      completedSteps,
      artifacts,
      stepResults,
      durationMs: Date.now() - pipelineStart,
    };
  }

  private emitEvent(type: PipelineEventType, payload: Record<string, unknown>): void {
    this.events.emit({
      id: `${this.definition.id}-${type}-${Date.now()}`,
      type,
      timestamp: Date.now(),
      source: `pipeline:${this.definition.id}`,
      payload,
    });
  }
}
