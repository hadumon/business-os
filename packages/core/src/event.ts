export interface Event<TPayload = unknown> {
  id: string;
  type: string;
  timestamp: number;
  source: string;
  payload: TPayload;
}

export type EventHandler<TPayload = unknown> = (event: Event<TPayload>) => void | Promise<void>;

export interface EventEmitter {
  emit<TPayload>(event: Event<TPayload>): void | Promise<void>;
  on<TPayload>(type: string, handler: EventHandler<TPayload>): void;
  off<TPayload>(type: string, handler: EventHandler<TPayload>): void;
}
