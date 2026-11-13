export default function BrandMark({ size = 32, className = '' }) {
  return <img src="/lifeai-icon.svg" width={size} height={size} className={`brand-mark ${className}`} alt="" aria-hidden="true" draggable="false" />;
}
