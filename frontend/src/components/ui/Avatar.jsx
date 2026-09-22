function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Avatar({
  name = "",
  src = "",
  size = "md",
  className = "",
}) {
  const initials = getInitials(name);

  return (
    <div
      className={`ui-avatar ui-avatar-${size} ${className}`.trim()}
      title={name}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="ui-avatar-image"
        />
      ) : (
        initials || "?"
      )}
    </div>
  );
}

export default Avatar;