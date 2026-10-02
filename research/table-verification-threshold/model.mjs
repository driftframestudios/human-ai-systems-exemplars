// Pure, bounded research calculations. Inputs describe scenarios, not readiness authority.
const STATES = 4;
const EDGE_KEYS = ['D_R', 'D_V', 'R_D', 'R_V', 'V_D', 'V_R', 'V_H'];
const EDGE_INDEX = [[0,1],[0,2],[1,0],[1,2],[2,0],[2,1],[2,3]];
function positive(value, name) {
  if (!Number.isFinite(value) || value < 1e-100 || value > 1e6) throw new RangeError(`${name} must be within the supported positive envelope [1e-100, 1e6]`);
  return value;
}
function nonnegative(value, name) {
  if (!Number.isFinite(value) || value < 0 || value > 1e6) throw new RangeError(`${name} must be within [0, 1e6]`);
  return value;
}
function count(value, name) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1e6) throw new RangeError(`${name} must be an integer from 0 through 1000000`);
  return value;
}
export function betaPosterior(a, b, events, opportunities) {
  positive(a, 'a'); positive(b, 'b'); count(events, 'events'); count(opportunities, 'opportunities');
  if (events > opportunities) throw new RangeError('events must fit opportunities');
  const A = positive(a + events, 'posterior a'), B = positive(b + (opportunities - events), 'posterior b');
  return { a: A, b: B, mean: A / (A + B), variance: A * B / ((A + B) ** 2 * (A + B + 1)) };
}
// O(k), O(1) space: posterior-predictive probability of >=1 event in k exchangeable opportunities.
export function betaAnyEvent(a, b, k) {
  positive(a, 'a'); positive(b, 'b'); count(k, 'k');
  let logZero = 0;
  for (let i = 0; i < k; i += 1) logZero -= Math.log1p(a / (b + i));
  return -Math.expm1(logZero);
}
// O(a), O(1) space. Exact integer-shape beta/binomial identity, evaluated with log-sum-exp.
export function betaUpperTail(a, b, x) {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a < 1 || b < 1 || a + b > 1000) throw new RangeError('integer beta shapes must be positive and total at most 1000');
  if (!Number.isFinite(x) || x < 0 || x > 1) throw new RangeError('x must be a probability');
  if (x === 0) return 1;
  if (x === 1) return 0;
  const n = a + b - 1;
  let logChoose = 0, largest = -Infinity, scaled = 0;
  for (let j = 0; j < a; j += 1) {
    if (j > 0) logChoose += Math.log(n - j + 1) - Math.log(j);
    const term = logChoose + j * Math.log(x) + (n - j) * Math.log1p(-x);
    if (term > largest) { scaled = scaled * Math.exp(largest - term) + 1; largest = term; }
    else scaled += Math.exp(term - largest);
  }
  return Math.min(1, Math.exp(largest) * scaled);
}
export function gammaPosterior(shape, rate, events, exposureMinutes) {
  positive(shape, 'shape'); positive(rate, 'rate'); count(events, 'events'); nonnegative(exposureMinutes, 'exposureMinutes');
  if (events > 0 && exposureMinutes === 0) throw new RangeError('positive events require positive eligible exposure');
  const A = positive(shape + events, 'posterior shape'), B = positive(rate + exposureMinutes, 'posterior rate');
  return { shape: A, rate: B, meanRatePerMinute: A / B };
}
export function waitingProbability(shape, rate, horizonMinutes) {
  positive(shape, 'shape'); positive(rate, 'rate'); nonnegative(horizonMinutes, 'horizonMinutes');
  return -Math.expm1(-shape * Math.log1p(horizonMinutes / rate));
}
export function waitingDensity(shape, rate, horizonMinutes) {
  positive(shape, 'shape'); positive(rate, 'rate'); nonnegative(horizonMinutes, 'horizonMinutes');
  return Math.exp(Math.log(shape) - Math.log(rate) - (shape + 1) * Math.log1p(horizonMinutes / rate));
}
// Constant 4-state space: rows D,R,V,H. H closes the recorded episode; later findings start a linked episode.
export function generator(rates = {}) {
  if (rates === null || typeof rates !== 'object' || Array.isArray(rates)) throw new TypeError('rates must be an object');
  for (const key of Object.keys(rates)) if (!EDGE_KEYS.includes(key)) throw new RangeError('unknown transition');
  const q = Array.from({ length: STATES }, () => Array(STATES).fill(0));
  EDGE_KEYS.forEach((key, index) => {
    const rate = Object.hasOwn(rates, key) ? nonnegative(rates[key], key) : 0;
    const [from, to] = EDGE_INDEX[index]; q[from][to] = rate; q[from][from] -= rate;
  });
  q.forEach((row, i) => nonnegative(-row[i], 'aggregate exit rate'));
  return q;
}
function probabilityVector(pi) {
  if (!Array.isArray(pi) || pi.length !== STATES) throw new RangeError('pi must have four probabilities totaling one');
  let total = 0;
  for (let index = 0; index < STATES; index += 1) {
    const value = pi[index];
    if (!Object.hasOwn(pi, index) || !Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('pi must have four own finite probabilities');
    total += value;
  }
  if (Math.abs(total - 1) > 1e-9) throw new RangeError('pi must have four probabilities totaling one');
}
function multiply(pi, matrix) {
  return Array.from({ length: STATES }, (_, j) => pi.reduce((sum, p, i) => sum + p * matrix[i][j], 0));
}
export function forwardDerivative(pi, rates) {
  probabilityVector(pi); return multiply(pi, generator(rates));
}
// Uniformization of exp(tQ), with bounded subintervals. O(steps * terms * 4^2), O(4^2) space.
export function propagate(pi, rates, minutes) {
  probabilityVector(pi); nonnegative(minutes, 'minutes');
  const q = generator(rates), nu = Math.max(...q.map((row, i) => -row[i]));
  if (nu === 0 || minutes === 0) return [...pi];
  const steps = Math.ceil(nu * minutes / 8);
  if (steps > 10000) throw new RangeError('scenario exceeds numerical work envelope');
  const z = nu * minutes / steps;
  const p = q.map((row, i) => row.map((value, j) => (i === j ? 1 : 0) + value / nu));
  let current = [...pi];
  for (let step = 0; step < steps; step += 1) {
    let term = [...current], weight = Math.exp(-z), mass = weight;
    let total = term.map(value => value * weight);
    for (let k = 1; k <= 200; k += 1) {
      term = multiply(term, p); weight *= z / k; mass += weight;
      total = total.map((value, i) => value + weight * term[i]);
      if (1 - mass < 1e-13) break;
    }
    if (1 - mass > 1e-12) throw new Error('Poisson truncation exceeded tolerance');
    current = total.map(value => value / mass);
  }
  return current;
}
// Fixed 3x3 backward equation. Only defined here for numerically nonsingular, absorbing scenarios.
export function expectedHandoffMinutes(rates) {
  const q = generator(rates);
  const a = q.slice(0,3).map((row, i) => [...row.slice(0,3), ...Array.from({length:3}, (_,j) => i === j ? 1 : 0), -1]);
  for (let c = 0; c < 3; c += 1) {
    let pivot = c;
    for (let r = c + 1; r < 3; r += 1) if (Math.abs(a[r][c]) > Math.abs(a[pivot][c])) pivot = r;
    if (Math.abs(a[pivot][c]) < 1e-12) throw new RangeError('finite handoff expectation is unresolved for this scenario');
    [a[c], a[pivot]] = [a[pivot], a[c]];
    const scale = a[c][c]; a[c] = a[c].map(value => value / scale);
    for (let r = 0; r < 3; r += 1) if (r !== c) { const factor = a[r][c]; a[r] = a[r].map((value,j) => value - factor * a[c][j]); }
  }
  const norm = rows => Math.max(...rows.map(row => row.reduce((sum,value) => sum + Math.abs(value), 0)));
  const condition = norm(q.slice(0,3).map(row => row.slice(0,3))) * norm(a.map(row => row.slice(3,6)));
  const result = a.map(row => row[6]);
  if (!Number.isFinite(condition) || condition > 1e10 || result.some(value => !Number.isFinite(value) || value < 0)) throw new RangeError('handoff expectation exceeds the solver conditioning envelope');
  return [...result, 0];
}
