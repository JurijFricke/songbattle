interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

const ProgressBar = ({ current, total, label }: ProgressBarProps) => {
  const percentage = total === 0 ? 0 : Math.min(100, (current / total) * 100);

  return (
    <div className="progressBar" aria-label={label}>
      {label && <div className="progressBarLabel">{label}</div>}
      <progress className="progressBarTrack" value={current} max={total} />
      <div className="progressBarText">{current} / {total}</div>
    </div>
  );
};

export default ProgressBar;
