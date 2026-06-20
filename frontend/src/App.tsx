import React, { useState, useEffect } from 'react';
import { TaskInput } from './components/TaskInput';
import { RunStatus } from './components/RunStatus';
import { StepLog } from './components/StepLog';
import { ScreenshotGallery } from './components/ScreenshotGallery';
import { startRun, subscribeToRun } from './api';
import type { StepEvent, RunState } from './api';
import './index.css';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [runState, setRunState] = useState<RunState>({
    status: 'idle',
    steps: []
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleStart = async (task: string) => {
    try {
      setRunState({ status: 'running', steps: [] });
      const runId = await startRun(task);
      
      subscribeToRun(
        runId, 
        (event: StepEvent) => {
          setRunState(prev => {
            const newState = { ...prev, steps: [...prev.steps, event] };
            if (event.type === 'error') newState.status = 'error';
            if (event.type === 'done') newState.status = 'completed';
            if (event.message) newState.finalMessage = event.message;
            return newState;
          });
        },
        () => {
           setRunState(prev => prev.status === 'running' ? { ...prev, status: 'completed' } : prev);
        }
      );
    } catch (err: any) {
      setRunState({ status: 'error', steps: [], finalMessage: err.message });
    }
  };

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>BrowserMind / Telemetry</h1>
          <p>Operator Console // Autonomous Live Process Monitor</p>
        </div>
        <button 
          onClick={toggleTheme} 
          style={{
            background: 'transparent',
            border: '1px solid var(--ink-main)',
            color: 'var(--ink-main)',
            padding: '0.5rem 1rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            textTransform: 'uppercase'
          }}
        >
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </button>
      </header>
      
      <main className="layout-grid">
        {/* Left Column: Command & Status */}
        <div className="panel" style={{ alignSelf: 'start' }}>
          <div className="panel-header">CMD / Control</div>
          <div className="panel-body">
            <TaskInput onStart={handleStart} disabled={runState.status === 'running'} />
            <RunStatus 
              status={runState.status} 
              message={runState.finalMessage} 
            />
          </div>
        </div>
        
        {/* Right Column: Viewport & Telemetry Tape */}
        <div className="panel">
          <div className="panel-header">LIVE / Viewport & Telemetry</div>
          
          {(() => {
            const latestScreenshot = runState.steps.filter(s => s.screenshotUrl).pop()?.screenshotUrl;
            return latestScreenshot ? (
              <div className="live-viewport">
                <img 
                  src={`http://localhost:3000${latestScreenshot}`} 
                  alt="Live Browser Viewport" 
                />
              </div>
            ) : null;
          })()}
          
          <StepLog steps={runState.steps} />
        </div>
      </main>

      <section className="filmstrip-section">
        <ScreenshotGallery steps={runState.steps} />
      </section>
    </div>
  );
}

export default App;
