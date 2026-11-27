export default function ProductVisual({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`product-visual ${className}`}
      role="img"
      aria-label="Original white Aeris purifier prototype with a charcoal radial grille and teal connectivity indicators"
    >
      <div className="product-halo halo-one" />
      <div className="product-halo halo-two" />
      <div className="product-shadow" />
      <div className="product-crop">
        <img src="/purifier-prototype.jpeg" alt="" />
      </div>
    </div>
  );
}
