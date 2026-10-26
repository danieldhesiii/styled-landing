const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
// Exercise the server loader without credentials or network access. Only the
// configured storage transport is replaced; the real path checks still run.
const file = path.resolve("lib/server/public-images.ts");
const compiled = new Module(file, module);
compiled.paths = module.paths;
compiled.require = (id) => {
  if (id === "server-only") return {};
  if (id === "@/lib/server/env")
    return { env: { supabaseUrl: "https://development.supabase.co" } };
  if (id === "@/lib/supabase/anon")
    return {
      createAnonClient: () => ({
        storage: {
          from: (bucket) => {
            assert.equal(bucket, "supplier-assets");
            return {
              download: async (name) => ({
                data:
                  name === "supplier/test.webp"
                    ? new Blob(["image-bytes"])
                    : null,
                error: null,
              }),
            };
          },
        },
      }),
    };
  return require(id);
};
compiled._compile(
  ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText,
  file,
);
const { readPublicImage } = compiled.exports;
test("server image inputs refuse arbitrary hosts, private URLs and path traversal", async () => {
  for (const url of [
    "https://example.org/photo.jpg",
    "http://127.0.0.1/secrets",
    "file:///etc/passwd",
    "/img/../../package.json",
    "/img/%2e%2e/%2e%2e/package.json",
    "https://development.supabase.co/storage/v1/object/public/private/file",
    "https://development.supabase.co.evil.test/storage/v1/object/public/supplier-assets/image",
  ])
    await assert.rejects(() => readPublicImage(url));
});
test("server image inputs read bundled photographs and the configured public bucket", async () => {
  const local = fs
    .readdirSync("public/img/venues")
    .find((name) => /\.(png|jpg|webp)$/i.test(name));
  assert.ok((await readPublicImage("/img/venues/" + local)).length > 0);
  assert.equal(
    (
      await readPublicImage(
        "https://development.supabase.co/storage/v1/object/public/supplier-assets/supplier/test.webp",
      )
    ).toString(),
    "image-bytes",
  );
  await assert.rejects(() =>
    readPublicImage(
      "https://development.supabase.co/storage/v1/object/public/supplier-assets/missing.webp",
    ),
  );
});
