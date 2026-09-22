function Card({
  children,
  className = "",
  padding = true,
  ...props
}) {
  return (
    <section
      className={`ui-card ${padding ? "ui-card-padding" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </section>
  );
}

export default Card;