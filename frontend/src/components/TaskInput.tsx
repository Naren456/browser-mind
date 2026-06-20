import React, { useState } from 'react';

interface TaskInputProps {
  onStart: (task: string, url?: string) => void;
  disabled: boolean;
}

export const TaskInput: React.FC<TaskInputProps> = ({ onStart, disabled }) => {
  const [task, setTask] = useState('open scaler.com and try to login');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task) onStart(task);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <input 
        className="cmd-input"
        type="text"
        value={task} 
        onChange={(e) => setTask(e.target.value)} 
        placeholder="> ENTER_CMD"
        disabled={disabled}
        required
        autoComplete="off"
        spellCheck="false"
      />
      <button type="submit" className="primary-btn" disabled={disabled || !task.trim()}>
        {disabled ? 'EXECUTING...' : 'INITIALIZE RUN'}
      </button>
    </form>
  );
};
