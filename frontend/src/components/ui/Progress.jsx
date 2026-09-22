function Progress({
  value = 0,
  max = 100,
  size = "md",
  className = "",
}) {
  const safeMax = max > 0 ? max : 100;
  const percentage = Math.min(
    100,
    Math.max(0, (value / safeMax) * 100),
  );

  return (
    <div
      className={`ui-progress ui-progress-${size} ${className}`.trim()}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin="0"
      aria-valuemax={safeMax}
    >
      <div
        className="ui-progress-value"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export default Progress;