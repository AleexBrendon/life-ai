import { forwardRef } from "react";
import { LoaderCircle } from "lucide-react";

const variants = {
  primary: "ui-button-primary",
  secondary: "ui-button-secondary",
  ghost: "ui-button-ghost",
  danger: "ui-button-danger",
};

const sizes = {
  sm: "ui-button-sm",
  md: "ui-button-md",
  lg: "ui-button-lg",
};

const Button = forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    className = "",
    type = "button",
    ...props
  },
  ref,
) {
  const variantClass = variants[variant] || variants.primary;
  const sizeClass = sizes[size] || sizes.md;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`ui-button ${variantClass} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {loading && <LoaderCircle className="ui-button-spinner" size={16} />}

      {children}
    </button>
  );
});

export default Button;