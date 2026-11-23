#!/usr/bin/env node
/*
 * Smoke test for android/patches/*.
 *
 * The patches are plain JS that run inside the game, but they can still be
 * checked without a phone or a GPU: this script stubs the browser APIs they
 * touch, hands them a fake engine, and asserts the behaviour that matters
 * (no developer checkpoint, no console, beach spawn in daylight, no heat).
 *
 * Usage: node android/tools/smoke-patches.mjs [assets-dir]
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const assets = process.argv[2] || "/tmp/pw1";
const patchFile = path.join(assets, "__nt-patches.js");
if (!existsSync(patchFile)) {
  console.error(`missing ${patchFile} — run apply-patches.py first`);
  process.exit(2);
}
const source = readFileSync(patchFile, "utf8");

/* ---- browser stubs -------------------------------------------------- */

const storage = new Map();
const calls = { teleport: null, hours: null, cleared: 0, busEmits: [] };

const fakeEngine = {
  console: {
    execute: (line) => `executed:${line}`,
    register: () => () => {},
  },
  bus: {
    handlers: {},
    on(name, fn) {
      (this.handlers[name] ||= []).push(fn);
    },
    emit(name, payload) {
      calls.busEmits.push(name);
      for (const fn of this.handlers[name] || []) fn(payload);
      return true;
    },
  },
  inputSystem: { consoleOpen: false, setConsoleOpen(v) { this.consoleOpen = v; } },
  flow: {
    phase: "menu",
    newGame() { this.phase = "game"; return Promise.resolve(true); },
  },
  player: {
    active: { teleport(x, y, z, yaw) { calls.teleport = { x, y, z, yaw }; } },
    activeId: "dez",
    cameraHandoff: true,
  },
  atmosphere: { clock: { running: false, set(h) { calls.hours = h; } }, setHours(h) { calls.hours = h; } },
  wanted: { stars: 3, clear() { this.stars = 0; calls.cleared++; } },
  police: { clear() { calls.cleared++; } },
  swat: { clear() { calls.cleared++; } },
  helis: { clear() { calls.cleared++; } },
};

const timers = [];
const sandbox = {
  console,
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  },
  setTimeout, clearTimeout,
  setInterval: (fn, ms) => {
    const id = setInterval(fn, ms);
    timers.push(id);
    return id;
  },
  clearInterval: (id) => {
    clearInterval(id);
    const i = timers.indexOf(id);
    if (i >= 0) timers.splice(i, 1);
  },
  // The Persian touch patch expects a DOM; an empty one is enough to run it.
  document: {
    readyState: "complete",
    body: { append() {}, querySelectorAll: () => [] },
    getElementById: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, dataset: {}, append() {}, prepend() {} }),
    createTreeWalker: () => ({ nextNode: () => null }),
    addEventListener() {},
  },
  NodeFilter: { SHOW_TEXT: 4 },
  window: {},
  navigator: { vibrate: () => true },
  location: { search: "" },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.window.__neonTideEngine = undefined;

/* ---- run ------------------------------------------------------------ */

const ctx = vm.createContext(sandbox);
vm.runInContext(source, ctx, { filename: "__nt-patches.js" });

// The bundle calls this right after boot().
vm.runInContext(
  "window.__neonTideBundleReady(window.__ntEngine || undefined)",
  Object.assign(ctx, { __ntEngine: fakeEngine })
);

// New game, as the menu would start it.
fakeEngine.flow.newGame();
// Let a couple of ticks run (the patch ticks every 250 ms).
await new Promise((r) => setTimeout(r, 400));

/* ---- assertions ----------------------------------------------------- */

assert.equal(storage.get("neon.devStart"), "off", "developer checkpoint must be off");
assert.equal(fakeEngine.console.execute("god"), "", "console must not execute commands");
assert.equal(fakeEngine.inputSystem.consoleOpen, false, "console must stay closed");

const panelEmits = calls.busEmits.filter((n) => n === "debug:togglePanel" || n === "debug:toggleConsole");
assert.equal(panelEmits.length, 0, "debug toggles must be swallowed");
fakeEngine.bus.emit("debug:toggleConsole");
assert.equal(calls.busEmits.includes("debug:toggleConsole"), false, "debug toggle must still be swallowed");

assert.ok(calls.teleport, "a new game must be repositioned");
assert.deepEqual(
  { x: calls.teleport.x, y: calls.teleport.y, z: calls.teleport.z },
  { x: 480.1, y: 0.4, z: -483.6 },
  "beach spawn coordinates"
);
assert.equal(calls.hours, 10.5, "morning clock");
assert.ok(calls.cleared > 0, "wanted level and units must be cleared");
assert.equal(fakeEngine.wanted.stars, 0, "no stars on a fresh free roam");

for (const id of timers) clearInterval(id);
console.log("smoke: patches behave as intended (spawn", calls.teleport, "hour", calls.hours, ")");
