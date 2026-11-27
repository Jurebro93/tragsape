import { PAD_COUNT, PETAL_COLORS, flowerPlace, flowerPosition, padOutline, type MeadowPetal } from "@/lib/meadow";

/**
 * Crtež otiska šape u kojem je cvijet, s označenim mjestom. Crta se na poslužitelju iz istog
 * rasporeda kao livada, pa mjesto na crtežu odgovara mjestu na livadi.
 */
export function TrailPaw({ number, petal, label }: { number: number; petal: MeadowPetal; label: string }) {
  const print = flowerPlace(number).print - 1;
  const pads = Array.from({ length: PAD_COUNT }, (_, k) => padOutline(print, k, 48));
  const points = pads.flat();
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const pad = 60;
  const width = maxX - minX + pad * 2;
  const height = maxY - minY + pad * 2;
  const flower = flowerPosition(number);
  const fx = flower.x - minX + pad;
  const fy = flower.y - minY + pad;
  const toPath = (outline: Array<{ x: number; y: number }>) =>
    outline.map((p, i) => `${i === 0 ? "M" : "L"}${(p.x - minX + pad).toFixed(1)} ${(p.y - minY + pad).toFixed(1)}`).join(" ") + "Z";
  return (
    <svg viewBox={`0 0 ${width.toFixed(0)} ${height.toFixed(0)}`} role="img" aria-label={label} className="h-auto w-full max-w-64">
      {pads.map((outline, index) => (
        <path key={index} d={toPath(outline)} className="fill-mint" />
      ))}
      <circle cx={fx} cy={fy} r={70} className="fill-white" opacity={0.85} />
      <circle cx={fx} cy={fy} r={70} fill="none" strokeWidth={10} className="stroke-teal" />
      {[0, 1, 2, 3, 4].map((k) => {
        const a = (k / 5) * Math.PI * 2;
        return <circle key={k} cx={fx + Math.cos(a) * 22} cy={fy + Math.sin(a) * 22} r={18} fill={PETAL_COLORS[petal]} className="stroke-line" strokeWidth={petal === "bijela" ? 3 : 0} />;
      })}
      <circle cx={fx} cy={fy} r={11} className="fill-plum" />
    </svg>
  );
}
