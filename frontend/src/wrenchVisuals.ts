import type Phaser from 'phaser';

export type Drawing = {
  [Method in 'clear' | 'fillStyle' | 'lineStyle' | 'fillCircle' | 'strokeCircle' |
  'fillRoundedRect' | 'strokeRoundedRect' | 'lineBetween' | 'beginPath' | 'moveTo' |
  'lineTo' | 'closePath' | 'fillPath' | 'strokePath']:
    (...args: Parameters<Phaser.GameObjects.Graphics[Method]>) => void;
};

/** A combination spanner: open parallel jaws and a transparent ring, not a repair glyph. */
export function drawWrench(g: Drawing, cx: number, cy: number, size: number, detailed = true) {
  const scale = size / 36;
  const angle = Math.PI / 4;
  const point = (x: number, y: number) => ({
    x: cx + (x * Math.cos(angle) - y * Math.sin(angle)) * scale,
    y: cy + (x * Math.sin(angle) + y * Math.cos(angle)) * scale
  });
  // The concave contour leaves the jaw opening genuinely empty at every size.
  const contour = [
    [-6.5, -16], [-8, -11], [-6, -7], [-2, -5], [-2, 8],
    [2, 8], [2, -5], [6, -7], [8, -11], [6.5, -16],
    [3, -13], [3, -9], [-3, -9], [-3, -13]
  ];
  g.fillStyle(0xb7c7d2);
  g.lineStyle(1.4 * scale, 0x172330);
  g.beginPath();
  contour.forEach(([x, y], index) => {
    const p = point(x, y);
    if (index === 0) g.moveTo(p.x, p.y);
    else g.lineTo(p.x, p.y);
  });
  g.closePath();
  g.fillPath();
  g.strokePath();

  const ring = point(0, 12);
  g.lineStyle(5 * scale, 0x172330);
  g.strokeCircle(ring.x, ring.y, 4 * scale);
  g.lineStyle(2.8 * scale, 0xd9e3e8);
  g.strokeCircle(ring.x, ring.y, 4 * scale);

  if (detailed) {
    g.lineStyle(1.1 * scale, 0xf5fcff);
    for (const [x1, y1, x2, y2] of [[-5.8, -13.5, -6, -10], [-1, -4, -1, 6], [-5, -8, -2, -6]]) {
      const a = point(x1, y1);
      const b = point(x2, y2);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }
}
