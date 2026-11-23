#!/usr/bin/env node
/**
 * Fails the build when the APK would show the in-app "404 not found" page.
 *
 * Checks the three things the WebView shell depends on:
 *   1. assets/www/index.html exists at that exact path (AssetManager prefix)
 *   2. every assets/ entry is stored (uncompressed) and 4-byte aligned
 *   3. assets/ entries are sorted and prefixed with real directory entries
 *
 * Usage: node check-apk.mjs <apk> [--quiet]
 */
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

const EOCD = 0x06054b50;
const CEN = 0x02014b50;

function readCentralDirectory(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 22 - 0xffff; i--) {
    if (buf.readUInt32LE(i) === EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not a zip/apk: end of central directory not found");
  const count = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const entries = [];
  let p = cdOffset;
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== CEN) throw new Error("corrupt central directory");
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const compSize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLen + localExtraLen;
    entries.push({ name, method, crc, compSize, size, localOffset, dataOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

const quietLocal = process.argv.includes("--local-align-skip");
const [, , apkPath] = process.argv;
if (!apkPath) {
  console.error("usage: node check-apk.mjs <apk>");
  process.exit(2);
}
const buf = readFileSync(apkPath);
const entries = readCentralDirectory(buf);
const problems = [];

const assets = entries.filter((e) => e.name.startsWith("assets/"));
const rootAssets = entries.filter((e) => !e.name.includes("/") && e.name !== "AndroidManifest.xml"
  && !["resources.arsc", "classes.dex"].includes(e.name));
if (rootAssets.length) {
  problems.push(`${rootAssets.length} file(s) sit at the archive root instead of under assets/ (e.g. ${rootAssets[0].name})`);
}
if (!entries.some((e) => e.name === "assets/www/index.html")) {
  problems.push("assets/www/index.html is missing — AssetManager would 404 the game shell");
}
if (!entries.some((e) => e.name === "classes.dex")) {
  problems.push("classes.dex is missing");
}
if (!entries.some((e) => e.name === "AndroidManifest.xml")) {
  problems.push("AndroidManifest.xml is missing");
}
for (const e of assets) {
  if (!quietLocal && e.method === 0 && e.dataOffset % 4 !== 0) {
    problems.push(`assets entry not 4-byte aligned: ${e.name} @${e.dataOffset}`);
  }
  // the bytes really must be there
  if (e.size > 0) {
    const slice = buf.subarray(e.dataOffset, e.dataOffset + e.compSize);
    try {
      const raw = e.method === 0 ? slice : inflateRawSync(slice);
      if (raw.length !== e.size) problems.push(`size mismatch: ${e.name}`);
    } catch (err) {
      problems.push(`unreadable entry ${e.name}: ${err.message}`);
    }
  }
}
const names = assets.map((e) => e.name);
const sorted = [...names].sort();
if (JSON.stringify(names) !== JSON.stringify(sorted)) {
  const firstDiff = names.findIndex((n, i) => n !== sorted[i]);
  problems.push(`assets/ entries are not sorted (first difference at #${firstDiff}: ${names[firstDiff]})`);
}
// Directory entries are optional: aapt2 omits them and apksigner drops them
// when re-writing the archive. Reported for context only.
const dirEntries = names.filter((n) => n.endsWith("/")).length;

const totalMB = (buf.length / 1048576).toFixed(1);
if (problems.length) {
  console.error(`APK check FAILED (${apkPath}, ${totalMB} MB, ${assets.length} asset files)`);
  for (const p of problems.slice(0, 20)) console.error("  - " + p);
  if (problems.length > 20) console.error(`  ... ${problems.length - 20} more`);
  process.exit(1);
}
const stored = assets.filter((e) => e.method === 0).length;
console.log(`    apk ok: ${totalMB} MB, ${entries.length} entries, ${assets.length} asset files ` +
  `(${stored} stored+aligned, ${assets.length - stored} deflated, ${dirEntries} dir entries), ` +
  `assets/www/index.html present`);
