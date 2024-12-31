export type WorkflowStepType =
  | "navigation"
  | "click"
  | "input"
  | "submit"
  | "wait"
  | "custom"
  | "tab_switch"
  | "tab_closed";

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  config: Record<string, any>;
  timestamp: number;
}

export interface ExecutionResult {
  success: boolean;
  stepId: string;
  timestamp: number;
  message?: string;
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  created: Date;
  modified: Date;
  description: string;
  tags: string[];
}

export interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<any>): void;
}

declare global {
  interface Window {
    skipWaiting(): Promise<void>;
    clients: Clients;
  }
}
