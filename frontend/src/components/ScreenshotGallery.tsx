import React from 'react';
import type { StepEvent } from '../api';

interface ScreenshotGalleryProps {
  steps: StepEvent[];
}

export const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({ steps }) => {
  const screenshots = steps
    .filter(s => s.type === 'step' && s.screenshotUrl)
    .map(s => ({
      url: `http://localhost:3000${s.screenshotUrl}`,
      tool: s.tool,
      time: new Date(s.timestamp).toLocaleTimeString()
    }));

  if (screenshots.length === 0) return null;

  return (
    <div className="filmstrip">
      {screenshots.map((s, i) => (
        <div key={i} className="filmstrip-frame">
          <a href={s.url} target="_blank" rel="noreferrer">
            <img src={s.url} alt={`Step ${i}`} loading="lazy" />
          </a>
          <div className="filmstrip-meta">
            <span style={{color: 'var(--ink-main)', fontWeight: 800, textTransform: 'uppercase'}}>{s.tool}</span>
            <span>{s.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
