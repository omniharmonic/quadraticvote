// Voter-similarity clustering for the results dashboard (PRD §4.3).
//
// Each ballot is a vector of credit allocations over the event's options.
// We L2-normalize the vectors (so "how a voter split their credits" matters,
// not how many they spent), project to 2D with PCA, and group with k-means.
// Voters who allocated similarly land near each other; clusters approximate
// voting coalitions.
//
// Pure and deterministic (no Math.random) so results are reproducible and
// unit-testable.

export interface VoterPoint {
  /** Opaque per-ballot key (already anonymized by the caller). */
  id: string;
  x: number;
  y: number;
  cluster: number;
  total_credits: number;
}

type Vector = number[];

function normalize(v: Vector): Vector {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

function subtractMean(rows: Vector[]): Vector[] {
  const dims = rows[0].length;
  const mean = new Array(dims).fill(0);
  for (const r of rows) for (let j = 0; j < dims; j++) mean[j] += r[j] / rows.length;
  return rows.map((r) => r.map((x, j) => x - mean[j]));
}

/**
 * Top principal component of mean-centered rows via power iteration.
 * Deterministic: starts from a fixed seed vector.
 */
function principalComponent(rows: Vector[], iterations = 60): Vector {
  const dims = rows[0].length;
  // Fixed, non-degenerate start vector.
  let v = normalize(Array.from({ length: dims }, (_, j) => 1 / (j + 1)));

  for (let it = 0; it < iterations; it++) {
    // w = Σ rows_i (rows_i · v)  — covariance multiply without forming the matrix.
    const w = new Array(dims).fill(0);
    for (const r of rows) {
      let dot = 0;
      for (let j = 0; j < dims; j++) dot += r[j] * v[j];
      for (let j = 0; j < dims; j++) w[j] += r[j] * dot;
    }
    const next = normalize(w);
    if (next.every((x, j) => Math.abs(x - v[j]) < 1e-10)) { v = next; break; }
    v = next;
  }
  return v;
}

function project(rows: Vector[], axis: Vector): number[] {
  return rows.map((r) => r.reduce((s, x, j) => s + x * axis[j], 0));
}

function removeComponent(rows: Vector[], axis: Vector): Vector[] {
  return rows.map((r) => {
    const dot = r.reduce((s, x, j) => s + x * axis[j], 0);
    return r.map((x, j) => x - dot * axis[j]);
  });
}

/**
 * Deterministic k-means: seeds with the farthest-point heuristic
 * (first centroid = point farthest from origin, then maximin), then runs
 * standard Lloyd iterations.
 */
function kmeans(points: Array<[number, number]>, k: number, iterations = 50): number[] {
  const n = points.length;
  if (k <= 1 || n <= k) return points.map((_, i) => (n <= k ? i % Math.max(k, 1) : 0));

  const dist2 = (a: [number, number], b: [number, number]) =>
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

  // Farthest-point seeding.
  const centroids: Array<[number, number]> = [];
  let first = 0;
  let best = -1;
  points.forEach((p, i) => {
    const d = p[0] ** 2 + p[1] ** 2;
    if (d > best) { best = d; first = i; }
  });
  centroids.push([...points[first]]);
  while (centroids.length < k) {
    let candidate = 0;
    let candidateDist = -1;
    points.forEach((p, i) => {
      const dMin = Math.min(...centroids.map((c) => dist2(p, c)));
      if (dMin > candidateDist) { candidateDist = dMin; candidate = i; }
    });
    centroids.push([...points[candidate]]);
  }

  let assignment = new Array(n).fill(0);
  for (let it = 0; it < iterations; it++) {
    const next = points.map((p) => {
      let bestC = 0;
      let bestD = Infinity;
      centroids.forEach((c, ci) => {
        const d = dist2(p, c);
        if (d < bestD) { bestD = d; bestC = ci; }
      });
      return bestC;
    });
    if (next.every((c, i) => c === assignment[i])) break;
    assignment = next;
    for (let ci = 0; ci < k; ci++) {
      const members = points.filter((_, i) => assignment[i] === ci);
      if (members.length > 0) {
        centroids[ci] = [
          members.reduce((s, p) => s + p[0], 0) / members.length,
          members.reduce((s, p) => s + p[1], 0) / members.length,
        ];
      }
    }
  }
  return assignment;
}

/**
 * Compute 2D cluster coordinates for a set of ballots.
 *
 * @param ballots  one entry per ballot: an opaque id, the allocation map,
 *                 and total credits spent (for dot sizing).
 * @param optionIds the event's option ids — fixes the vector dimension order.
 */
export function computeVoterClusters(
  ballots: Array<{ id: string; allocations: Record<string, number>; totalCredits: number }>,
  optionIds: string[]
): VoterPoint[] {
  const usable = ballots.filter(
    (b) => b.allocations && Object.values(b.allocations).some((c) => Number(c) > 0)
  );
  if (usable.length === 0 || optionIds.length === 0) return [];

  const vectors = usable.map((b) =>
    normalize(optionIds.map((id) => Number(b.allocations[id]) || 0))
  );

  let xs: number[];
  let ys: number[];

  if (optionIds.length === 1) {
    xs = vectors.map((v) => v[0]);
    ys = vectors.map(() => 0);
  } else {
    const centered = subtractMean(vectors);
    const pc1 = principalComponent(centered);
    xs = project(centered, pc1);
    const residual = removeComponent(centered, pc1);
    const pc2 = principalComponent(residual);
    ys = project(residual, pc2);
  }

  const k = Math.min(3, Math.max(1, Math.floor(usable.length / 3)));
  const clusters = kmeans(xs.map((x, i) => [x, ys[i]] as [number, number]), k);

  return usable.map((b, i) => ({
    id: b.id,
    x: Number(xs[i].toFixed(4)),
    y: Number(ys[i].toFixed(4)),
    cluster: clusters[i],
    total_credits: b.totalCredits,
  }));
}
