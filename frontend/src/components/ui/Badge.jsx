const variants = {
  default: "ui-badge-default",
  success: "ui-badge-success",
  warning: "ui-badge-warning",
  danger: "ui-badge-danger",
  info: "ui-badge-info",
  purple: "ui-badge-purple",
};

function Badge({
  children,
  variant = "default",
  className = "",
}) {
  const variantClass =
    variants[variant] || variants.default;

  return (
    <span
      className={`ui-badge ${variantClass} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

export default Badge;