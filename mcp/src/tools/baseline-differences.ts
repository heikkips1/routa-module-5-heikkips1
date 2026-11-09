import { readFileSync } from "node:fs";
import { getSettings } from "../platform.ts";
import type { Settings } from "../platform.ts";
import { requireToken } from "../token-check.ts";

export type Baseline = { access: Record<string, string[]>; policies: Record<string, boolean | number | string> };

const show = (value: unknown) => JSON.stringify(value);

export function differences(settings: Settings, baseline: Baseline): string[] {
  const lines: string[] = [];
  for (const { group, apps } of settings.access) {
    const allowed = baseline.access[group] ?? [];
    for (const app of apps) if (!allowed.includes(app)) lines.push(`${group} reaches ${app}, but the baseline says it must not.`);
    for (const app of allowed) if (!apps.includes(app)) lines.push(`${group} doesn't reach ${app}, but the baseline says it should.`);
  }
  for (const group of Object.keys(baseline.access)) {
    if (!settings.access.some((a) => a.group === group)) lines.push(`The baseline has a group called ${group}, which the platform doesn't have.`);
  }
  for (const { id, value } of settings.policies) {
    if (!(id in baseline.policies)) lines.push(`${id} is ${show(value)}, and the baseline doesn't mention it.`);
    else if (baseline.policies[id] !== value) lines.push(`${id} is ${show(value)}, but the baseline says ${show(baseline.policies[id])}.`);
  }
  for (const id of Object.keys(baseline.policies)) {
    if (!settings.policies.some((p) => p.id === id)) lines.push(`The baseline has a policy called ${id}, which the platform doesn't have.`);
  }
  return lines;
}

export function readBaseline(): Baseline {
  return JSON.parse(readFileSync(new URL("../../../client/security-baseline.json", import.meta.url), "utf8"));
}

export const baselineDifferencesTool = {
  name: "baseline_differences",
  description:
    "List every setting that differs from Routa's security baseline, in plain words. Read-only: it works with a read-only token and changes nothing.",
  inputSchema: { type: "object", properties: {} },
  async handler() {
    await requireToken();
    const lines = differences(await getSettings(), readBaseline());
    if (lines.length === 0) return "Every setting matches the baseline.";
    return `${lines.length} settings differ from the baseline:\n${lines.map((l) => `- ${l}`).join("\n")}`;
  },
};
