/**
 * Shareable simulation state: URL query `?sim=<id>:k.v,k.v|<id2>:…`
 * and speed `?spd=2`. Pure functions — unit-tested.
 */

export function encodeSimParams(
  all: Record<string, Record<string, number>>,
): string {
  return Object.entries(all)
    .map(([id, params]) => {
      const kv = Object.entries(params)
        .map(([k, v]) => `${k}.${encodeURIComponent(String(v))}`)
        .join(",");
      return `${id}:${kv}`;
    })
    .join("|");
}

export function decodeSimParams(
  search: string,
): Record<string, Record<string, number>> {
  const raw = new URLSearchParams(search).get("sim");
  if (!raw) return {};
  const out: Record<string, Record<string, number>> = {};
  for (const block of raw.split("|")) {
    const colon = block.indexOf(":");
    if (colon < 1) continue;
    const id = block.slice(0, colon);
    const params: Record<string, number> = {};
    for (const pair of block.slice(colon + 1).split(",")) {
      const dot = pair.indexOf(".");
      if (dot < 1) continue;
      const key = pair.slice(0, dot);
      const value = Number(decodeURIComponent(pair.slice(dot + 1)));
      if (key && Number.isFinite(value)) params[key] = value;
    }
    if (Object.keys(params).length) out[id] = params;
  }
  return out;
}

export function decodeSpeed(search: string): number | null {
  const raw = new URLSearchParams(search).get("spd");
  if (!raw) return null;
  const n = Number(raw);
  return [0.25, 0.5, 1, 2].includes(n) ? n : null;
}
