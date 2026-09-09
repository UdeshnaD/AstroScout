const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "../..");
module.exports = function load(file, cache = new Map()) {
  const filename = path.resolve(root, file);
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const localRequire = createRequire(filename);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2021,
    },
  }).outputText;
  new Function("require", "module", "exports", compiled)(
    (name) =>
      name.startsWith(".")
        ? load(path.resolve(path.dirname(filename), `${name}.ts`), cache)
        : localRequire(name),
    module,
    module.exports,
  );
  return module.exports;
};
