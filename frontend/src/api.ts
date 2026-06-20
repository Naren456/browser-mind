export interface StepEvent {
  type: 'reasoning' | 'step' | 'done' | 'error';
  tool?: string;
  args?: any;
  result?: any;
  screenshotUrl?: string;
  message?: string;
  timestamp: string;
}

export interface RunState {
  status: 'idle' | 'running' | 'completed' | 'error';
  steps: StepEvent[];
  finalMessage?: string;
}

const API_BASE = 'http://localhost:3000/api';

export async function startRun(task: string): Promise<string> {
  const res = await fetch(`${API_BASE}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task })
  });
  if (!res.ok) {
    throw new Error('Failed to start run');
  }
  const data = await res.json();
  return data.runId;
}

export function subscribeToRun(runId: string, onEvent: (event: StepEvent) => void, onDone: () => void): () => void {
  const eventSource = new EventSource(`${API_BASE}/runs/${runId}/events`);
  
  eventSource.onmessage = (e) => {
    try {
      const event: StepEvent = JSON.parse(e.data);
      onEvent(event);
      if (event.type === 'done' || event.type === 'error') {
        eventSource.close();
        onDone();
      }
    } catch (err) {
      console.error("Error parsing event data", err);
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    onDone();
  };

  return () => {
    eventSource.close();
  };
}
