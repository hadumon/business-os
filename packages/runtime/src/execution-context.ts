import type { Memory } from "@business-os/core";
import type { ArtifactManager } from "@business-os/artifact-core";
import { SimpleEventEmitter } from "@business-os/workflow";

export interface RuntimeDependencies {
  memory: Memory;
  artifacts: ArtifactManager;
}

export class ExecutionContext {
  readonly events = new SimpleEventEmitter();
  readonly memory: Memory;
  readonly artifacts: ArtifactManager;
  private abortController = new AbortController();

  constructor(deps: RuntimeDependencies) {
    this.memory = deps.memory;
    this.artifacts = deps.artifacts;
  }

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  cancel(): void {
    this.abortController.abort();
  }

  get isCancelled(): boolean {
    return this.abortController.signal.aborted;
  }
}
