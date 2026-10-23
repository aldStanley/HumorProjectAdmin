import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
function load(file, replacements = []) {
  let s = fs.readFileSync(new URL(file, import.meta.url), "utf8");
  for (const [pattern, value] of replacements) s = s.replace(pattern, value);
  const js = ts.transpile(s, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
  );
}
const { resources, getResource, validateFields } = await load(
  "../src/lib/domain/resources.ts",
);
const { chooseChain } = await load("../src/lib/domain/generation-plan.ts");
test("resource names and writable fields form an explicit allowlist", () => {
  assert.equal(getResource("profiles"), undefined);
  assert.equal(getResource("__proto__"), undefined);
  assert.equal(getResource("requests").mode, "read");
  assert.equal(getResource("prompt-mix").mode, "update");
  assert.throws(
    () =>
      validateFields(resources.terms, {
        term: "Core",
        definition: "Classes",
        enabled: true,
        is_superadmin: true,
      }),
    /cannot be edited/,
  );
  assert.throws(
    () =>
      validateFields(resources["prompt-mix"], {
        weight: 1,
        enabled: true,
        chain_id: "a",
      }),
    /cannot be edited/,
  );
});
test("domain and email input is normalized and invalid values rejected", () => {
  assert.equal(
    validateFields(resources["signup-domains"], {
      domain: "Columbia.edu",
      notes: "",
      enabled: true,
    }).domain,
    "columbia.edu",
  );
  for (const domain of [
    "https://columbia.edu",
    "@columbia.edu",
    "example..com",
    "testcom",
  ])
    assert.throws(() =>
      validateFields(resources["signup-domains"], {
        domain,
        notes: "",
        enabled: true,
      }),
    );
  assert.equal(
    validateFields(resources["email-whitelist"], {
      email: "Person@Columbia.edu",
      notes: "",
      enabled: true,
    }).email,
    "person@columbia.edu",
  );
});
test("mix weights must be finite whole numbers within bounds", () => {
  for (const weight of [-1, 1001, NaN, Infinity, 1.5])
    assert.throws(() =>
      validateFields(resources["prompt-mix"], { weight, enabled: true }),
    );
});
test("weighted routing excludes disabled and zero-weight chains", () => {
  const entries = [
    { chain_id: "off", enabled: false, weight: 999 },
    { chain_id: "zero", enabled: true, weight: 0 },
    { chain_id: "a", enabled: true, weight: 25 },
    { chain_id: "b", enabled: true, weight: 75 },
  ];
  assert.equal(
    chooseChain(entries, () => 0),
    "a",
  );
  assert.equal(
    chooseChain(entries, () => 0.249),
    "a",
  );
  assert.equal(
    chooseChain(entries, () => 0.25),
    "b",
  );
  assert.equal(
    chooseChain(entries, () => 0.999),
    "b",
  );
  assert.throws(() => chooseChain(entries.slice(0, 2)), /paused/);
});
const validationJs = ts
  .transpile(
    fs.readFileSync(
      new URL("../src/lib/captions/validation.ts", import.meta.url),
      "utf8",
    ),
    { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  )
  .replace(/export /g, "");
const planJs = ts
  .transpile(
    fs.readFileSync(
      new URL("../src/lib/domain/generation-plan.ts", import.meta.url),
      "utf8",
    ),
    { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  )
  .replace(/export /g, "");
const { runGeneration } = await load("../src/lib/domain/generation.ts", [
  [/^import .*;\n/gm, ""],
  [
    /type Model\s*=/,
    `class AccessError extends Error { constructor(status,message){super(message);this.status=status;} }\n${validationJs}\n${planJs}\ntype Model=`,
  ],
]);
function client() {
  const logs = [];
  const model = {
    id: "m",
    model_identifier: "test-model",
    enabled: true,
    supports_vision: true,
    llm_providers: { provider_type: "google", enabled: true },
  };
  const tables = {
    prompt_chain_mix: [{ chain_id: "c", weight: 100, enabled: true }],
    prompt_chain_steps: [
      {
        id: "s1",
        system_prompt: "Describe",
        input_kind: "image",
        output_format: "text",
        llm_models: model,
      },
      {
        id: "s2",
        system_prompt: "Write",
        input_kind: "previous_text",
        output_format: "captions_json",
        llm_models: model,
      },
    ],
    terms: [{ term: "Core", definition: "Curriculum" }],
    ai_generation_examples: [
      { input_description: "Library", output_caption: "A sample" },
    ],
  };
  return {
    logs,
    from(table) {
      const q = {
        select() {
          return q;
        },
        eq() {
          return q;
        },
        or() {
          return q;
        },
        order() {
          return q;
        },
        limit() {
          return q;
        },
        then(resolve) {
          return Promise.resolve({ data: tables[table], error: null }).then(
            resolve,
          );
        },
      };
      return q;
    },
    async rpc(name, args) {
      logs.push({ name, args });
      return {
        data: name === "admin_start_generation" ? "request" : null,
        error: null,
      };
    },
  };
}
test("real runner uses the chosen pipeline and logs both model calls without image bytes", async () => {
  const original = global.fetch;
  const calls = [];
  process.env.GEMINI_API_KEY = "unit-test";
  global.fetch = async (url, options) => {
    calls.push(JSON.parse(options.body));
    const text =
      calls.length === 1
        ? "A library photo."
        : JSON.stringify({ captions: ["One", "Two", "Three"] });
    return Response.json({
      candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }],
      usageMetadata: { totalTokenCount: 10 },
    });
  };
  try {
    const c = client();
    const result = await runGeneration(c, Buffer.from("photo"), "image/png");
    assert.deepEqual(result.captions, ["One", "Two", "Three"]);
    assert.equal(result.request_id, "request");
    assert.ok(calls[0].contents[0].parts[1].inlineData);
    assert.equal(calls[1].contents[0].parts.length, 1);
    assert.match(calls[1].systemInstruction.parts[0].text, /Curriculum/);
    assert.equal(
      c.logs.filter((x) => x.name === "admin_log_response").length,
      2,
    );
    assert.equal(c.logs.at(-1).args.succeeded, true);
    assert.ok(
      !JSON.stringify(c.logs).includes(Buffer.from("photo").toString("base64")),
    );
  } finally {
    global.fetch = original;
  }
});
test("provider failures are logged and finish the request as failed", async () => {
  const original = global.fetch;
  global.fetch = async () =>
    Response.json(
      { error: { code: 429, status: "RESOURCE_EXHAUSTED" } },
      { status: 429 },
    );
  try {
    const c = client();
    await assert.rejects(
      runGeneration(c, Buffer.from("photo"), "image/png"),
      /limit/,
    );
    assert.equal(
      c.logs.find((x) => x.name === "admin_log_response").args.status_code,
      429,
    );
    assert.equal(c.logs.at(-1).args.succeeded, false);
  } finally {
    global.fetch = original;
  }
});
