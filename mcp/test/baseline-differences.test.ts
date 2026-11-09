import assert from "node:assert/strict";
import { test } from "node:test";
import { baselineDifferencesTool, differences } from "../src/tools/baseline-differences.ts";
import { fakePlatform } from "./fake-platform.ts";

const baseline = { access: { staff: ["documents"], guests: [] }, policies: { "session-length-hours": 8, "guest-access": "invite-only" } };
const settings = {
  access: [{ group: "staff", apps: ["crm"] }],
  policies: [
    { id: "session-length-hours", label: "Session", value: 24 },
    { id: "extra", label: "Extra", value: true },
  ],
};

test("differences says each one in plain words", () => {
  assert.deepEqual(differences(settings, baseline), [
    "staff reaches crm, but the baseline says it must not.",
    "staff doesn't reach documents, but the baseline says it should.",
    "The baseline has a group called guests, which the platform doesn't have.",
    "session-length-hours is 24, but the baseline says 8.",
    "extra is true, and the baseline doesn't mention it.",
    "The baseline has a policy called guest-access, which the platform doesn't have.",
  ]);
});

test("no differences when the settings match", () => {
  const same = { access: [{ group: "staff", apps: ["documents"] }], policies: [{ id: "a", label: "A", value: 1 }] };
  assert.deepEqual(differences(same, { access: { staff: ["documents"] }, policies: { a: 1 } }), []);
});

test("baseline_differences works with a read-only token and changes nothing", async () => {
  const { patches } = fakePlatform("read");
  assert.match(await baselineDifferencesTool.handler(), /settings differ from the baseline/);
  assert.equal(patches.length, 0);
});
