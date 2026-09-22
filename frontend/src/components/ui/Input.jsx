import { forwardRef } from "react";

const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    id,
    className = "",
    ...props
  },
  ref,
) {
  const inputId = id || props.name;

  return (
    <div className="ui-input-field">
      {label && (
        <label
          htmlFor={inputId}
          className="ui-input-label"
        >
          {label}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        className={`ui-input ${
          error ? "ui-input-error" : ""
        } ${className}`.trim()}
        {...props}
      />

      {error && (
        <span className="ui-input-message ui-input-message-error">
          {error}
        </span>
      )}

      {!error && hint && (
        <span className="ui-input-message">
          {hint}
        </span>
      )}
    </div>
  );
});

export default Input;