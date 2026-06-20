import React, { useEffect, useRef } from 'react';
import type { StepEvent } from '../api';

interface StepLogProps {
  steps: StepEvent[];
}

export const StepLog: React.FC<StepLogProps> = ({ steps }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  return (
    <div className="telemetry-tape">
      {steps.map((step, i) => {
        const time = new Date(step.timestamp).toISOString().split('T')[1].replace('Z', '');
        return (
          <div key={i} className="telemetry-entry">
            <div className="telemetry-time">{time}</div>
            <div className="telemetry-data">
              {step.type === 'reasoning' && <div className="telemetry-type-reasoning">[THINK] {step.message}</div>}
              {step.type === 'step' && (
                <div>
                  <div className="telemetry-type-action">[ACTION] {step.tool}</div>
                  <div className="telemetry-args">{JSON.stringify(step.args, null, 2)}</div>
                  <div className={`telemetry-result ${step.result?.success ? 'success' : 'error'}`}>
                    {step.result?.success ? 'OK' : `ERR: ${step.result?.error}`}
                  </div>
                </div>
              )}
              {(step.type === 'error' || step.type === 'done') && <div style={{fontWeight: 800}}>[SYS] {step.message}</div>}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
};
