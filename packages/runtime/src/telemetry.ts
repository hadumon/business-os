export interface TelemetryEvent {
  name: string;
  timestamp: number;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

export interface TelemetrySink {
  record(event: TelemetryEvent): void;
}

export class InMemoryTelemetrySink implements TelemetrySink {
  readonly events: TelemetryEvent[] = [];
  record(event: TelemetryEvent): void {
    this.events.push(event);
  }
}
