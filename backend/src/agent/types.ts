export interface StepEvent {
  type: 'reasoning' | 'step' | 'done' | 'error';
  tool?: string;
  args?: any;
  result?: any;
  screenshotUrl?: string;
  message?: string;
  timestamp: string;
}

export interface RunResult {
  status: 'running' | 'completed' | 'error';
  steps: StepEvent[];
  finalMessage?: string;
}
