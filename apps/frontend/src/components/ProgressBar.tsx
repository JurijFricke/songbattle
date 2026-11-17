import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, label }) => {
  const percentage = total === 0 ? 0 : (current / total) * 100;

  return (
    <div className="progress-bar-container">
      {label && <div className="progress-bar-label">{label}</div>}
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
      </div>
      <div className="progress-bar-text">{current} / {total}</div>
    </div>
  );
};

export default ProgressBar;