/**
 * Allow ops scripts to import Next.js `server-only` modules under tsx.
 * Usage: node --require ./scripts/shims/server-only-stub.cjs ...
 */
const Module = require("module");
const path = require("path");

const stub = path.join(__dirname, "server-only-empty.js");
const original = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") {
    return stub;
  }
  return original.call(this, request, parent, isMain, options);
};
