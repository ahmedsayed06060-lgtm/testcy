export type CVSSSeverity = 'None' | 'Low' | 'Medium' | 'High' | 'Critical';

const weights = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  UI: { N: 0.85, R: 0.62 },
  PRU: { N: 0.85, L: 0.62, H: 0.27 },
  PRC: { N: 0.85, L: 0.68, H: 0.5 },
  CIA: { H: 0.56, L: 0.22, N: 0 },
} as const;

function roundUp(value: number) {
  return Math.ceil((value - Number.EPSILON) * 10) / 10;
}

export function calculateCVSS(vector: string): { score: number; severity: CVSSSeverity } {
  const parts = vector.trim().split('/');
  if (!['CVSS:3.1', 'CVSS:3.0'].includes(parts[0] ?? '')) throw new Error('Vector must start with CVSS:3.1 or CVSS:3.0');
  const metrics = Object.fromEntries(parts.slice(1).map((part) => part.split(':')));
  const required = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'];
  if (required.some((key) => !metrics[key]) || Object.keys(metrics).length !== 8) throw new Error('All eight CVSS base metrics are required exactly once');
  if (!['U', 'C'].includes(metrics.S!)) throw new Error('Scope must be U or C');
  try {
    const av = weights.AV[metrics.AV as keyof typeof weights.AV];
    const ac = weights.AC[metrics.AC as keyof typeof weights.AC];
    const ui = weights.UI[metrics.UI as keyof typeof weights.UI];
    const pr = metrics.S === 'C' ? weights.PRC[metrics.PR as keyof typeof weights.PRC] : weights.PRU[metrics.PR as keyof typeof weights.PRU];
    const c = weights.CIA[metrics.C as keyof typeof weights.CIA];
    const i = weights.CIA[metrics.I as keyof typeof weights.CIA];
    const a = weights.CIA[metrics.A as keyof typeof weights.CIA];
    if ([av, ac, ui, pr, c, i, a].some((value) => value === undefined)) throw new Error('Invalid metric value');
    const iss = 1 - (1 - c) * (1 - i) * (1 - a);
    const impact = metrics.S === 'U' ? 6.42 * iss : 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15;
    const exploitability = 8.22 * av * ac * pr * ui;
    const raw = impact <= 0 ? 0 : metrics.S === 'U' ? Math.min(impact + exploitability, 10) : Math.min(1.08 * (impact + exploitability), 10);
    const score = roundUp(raw);
    const severity: CVSSSeverity = score === 0 ? 'None' : score < 4 ? 'Low' : score < 7 ? 'Medium' : score < 9 ? 'High' : 'Critical';
    return { score, severity };
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid metric value') throw error;
    throw new Error('Vector contains an invalid metric value');
  }
}
