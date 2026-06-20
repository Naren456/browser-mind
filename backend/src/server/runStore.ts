import { EventEmitter } from 'events';
import { RunResult, StepEvent } from '../agent/types';

export class RunStore {
  private runs: Map<string, {
    status: RunResult['status'];
    steps: StepEvent[];
    emitter: EventEmitter;
    finalMessage?: string;
  }> = new Map();

  createRun(runId: string) {
    this.runs.set(runId, {
      status: 'running',
      steps: [],
      emitter: new EventEmitter()
    });
  }

  getRun(runId: string) {
    return this.runs.get(runId);
  }

  addStep(runId: string, event: StepEvent) {
    const run = this.runs.get(runId);
    if (!run) return;
    
    run.steps.push(event);
    run.emitter.emit('event', event);

    if (event.type === 'done' || event.type === 'error') {
      run.status = event.type === 'done' ? 'completed' : 'error';
      run.finalMessage = event.message;
      // Emit close to signify end of stream
      run.emitter.emit('close');
    }
  }
}

export const runStore = new RunStore();
