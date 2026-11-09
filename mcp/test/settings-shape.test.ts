// Checks that settings have the shape the tools expect: what the fake platform returns always,
// and a copy of what our own platform returned when we built this, when it is on this machine.
// The copy is in mcp/test/fixtures/local-*, which is not committed, so CI doesn't have it.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { getSettings } from "../src/platform.ts";
import { fakePlatform } from "./fake-platform.ts";

function assertShape(settings: { access: { group: string; apps: string[] }[]; policies: { id: string }[] }) {
  assert.ok(Array.isArray(settings.access));
  assert.ok(settings.access.every((a) => typeof a.group === "string" && Array.isArray(a.apps)));
  assert.ok(settings.policies.every((p) => typeof p.id === "string"));
}

test("the fake platform's settings have the shape the tools expect", async () => {
  fakePlatform();
  assertShape(await getSettings());
});

const recordedFile = new URL("./fixtures/local-settings.json", import.meta.url);
test("the recorded settings have the shape the tools expect", { skip: !existsSync(recordedFile) && "no local recording on this machine" }, () => {
  assertShape(JSON.parse(readFileSync(recordedFile, "utf8")));
});
