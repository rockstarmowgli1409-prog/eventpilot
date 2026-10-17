export const money = (n: number | null | undefined): string =>
  n == null ? "—" : n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

export const pct = (n: number | null | undefined): string =>
  n == null ? "—" : `${(n * 100).toFixed(1)}%`;

export const seconds = (ms: number | null | undefined): string =>
  ms == null ? "—" : `${(ms / 1000).toFixed(2)}s`;

export const usd = (n: number | null | undefined): string =>
  n == null ? "—" : `$${n.toFixed(2)}`;
