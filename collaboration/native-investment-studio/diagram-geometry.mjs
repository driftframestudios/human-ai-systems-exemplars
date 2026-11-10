const CURVE_STEPS = 32;
const interpolate = (a, b, amount) => a.map((value, axis) => value + (b[axis] - value) * amount);
const unit = (from, to, fallback) => {
  const dx = to[0] - from[0], dy = to[1] - from[1], length = Math.hypot(dx, dy);
  return length ? [dx / length, dy / length] : fallback;
};
const offset = (point, direction, amount) => [point[0] - direction[1] * amount, point[1] + direction[0] * amount];
const point = value => value.map(number => Number(number.toFixed(3))).join(' ');

// One filled outline joins the shaft and head. A bounded sampled cubic keeps
// the shaft's local width through S bends at these small diagram dimensions.
export function diagramArrowPath({ start, end, control1 = interpolate(start, end, 1 / 3),
  control2 = interpolate(start, end, 2 / 3), shaftWidth = 5, headLength = 14, headWidth = 14 }) {
  const fallback = unit(start, end, [1, 0]), endDirection = unit(control2, end, fallback);
  const samples = Array.from({ length: CURVE_STEPS + 1 }, (_, index) => {
    const t = index / CURVE_STEPS, u = 1 - t;
    const location = start.map((value, axis) => u ** 3 * value + 3 * u * u * t * control1[axis]
      + 3 * u * t * t * control2[axis] + t ** 3 * end[axis]);
    const tangent = start.map((value, axis) => 3 * u * u * (control1[axis] - value)
      + 6 * u * t * (control2[axis] - control1[axis]) + 3 * t * t * (end[axis] - control2[axis]));
    return { location, direction: unit([0, 0], tangent, fallback) };
  });
  // Keep the shaft behind the head, including on short straight connections.
  let remaining = Math.min(headLength, samples.slice(1).reduce((length, sample, index) =>
    length + Math.hypot(...sample.location.map((value, axis) => value - samples[index].location[axis])), 0) / 2);
  let base = end;
  while (samples.length > 1 && remaining > 0) {
    const endSample = samples.pop(), previous = samples.at(-1);
    const length = Math.hypot(...endSample.location.map((value, axis) => value - previous.location[axis]));
    if (remaining <= length) {
      base = interpolate(endSample.location, previous.location, remaining / length);
      break;
    }
    remaining -= length;
  }
  // The actual curve cutoff is the shared neck. Moving it to the terminal
  // tangent folds tight bends back through the head; the cutoff-to-tip direction
  // keeps both sides joined and still points at the receiving endpoint.
  const headDirection = unit(base, end, endDirection);
  samples.push({ location: base, direction: headDirection });
  const left = samples.map(sample => offset(sample.location, sample.direction, shaftWidth / 2));
  const right = samples.map(sample => offset(sample.location, sample.direction, -shaftWidth / 2)).reverse();
  const outline = [...left, offset(base, headDirection, headWidth / 2), end,
    offset(base, headDirection, -headWidth / 2), ...right];
  return `M ${outline.map(point).join(' L ')} Z`;
}
