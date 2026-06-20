import React from 'react';

interface RunStatusProps {
  status: 'idle' | 'running' | 'completed' | 'error';
  message?: string;
  finalScreenshot?: string;
}

export const RunStatus: React.FC<RunStatusProps> = ({ status, message, finalScreenshot }) => {
  return (
    <div className={`status-banner status-${status}`}>
      <div className="status-text">
        <span className="status-indicator"></span>
        SYS_STATE: {status.toUpperCase()}
      </div>
      {message && <div style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>{message}</div>}
    </div>
  );
};
