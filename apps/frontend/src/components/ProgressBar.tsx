interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

const ProgressBar = ({ current, total, label }: ProgressBarProps) => {
  return (
    <div className="progressBar" aria-label={label}>
      {label && <div className="progressBarLabel">{label}</div>}
      <progress className="progressBarTrack" value={current} max={total} />
      <div className="progressBarText">
        {current} / {total}
      </div>
    </div>
  );
};

export default ProgressBar;
