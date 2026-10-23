export type MixEntry = { chain_id: string; weight: number; enabled: boolean };
export function chooseChain(entries: MixEntry[], random = Math.random): string {
  const active = entries.filter(
    (x) => x.enabled && Number.isInteger(x.weight) && x.weight > 0,
  );
  const total = active.reduce((n, x) => n + x.weight, 0);
  if (!total)
    throw new Error(
      "Admin generation is paused. Enable a prompt chain with a positive mix weight.",
    );
  let pick = random() * total;
  for (const entry of active) {
    pick -= entry.weight;
    if (pick < 0) return entry.chain_id;
  }
  return active[active.length - 1].chain_id;
}
