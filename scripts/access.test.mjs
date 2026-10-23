import { test } from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://localhost:3001";
for (const path of [
  "/",
  "/profiles",
  "/media",
  "/media?create=1",
  "/ratings",
  "/ratings?kind=jury",
  "/private/unknown",
  "/media.csv",
]) {
  test(`signed-out page ${path} redirects without data`, async () => {
    const response = await fetch(`${base}${path}`, { redirect: "manual" });
    assert.ok([303, 307].includes(response.status));
    assert.equal(
      new URL(response.headers.get("location"), base).pathname,
      "/login",
    );
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.doesNotMatch(
      await response.text(),
      /642270ed|6063eded|first_name|caption_images/,
    );
  });
}
for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
  test(`signed-out ${method} media API is denied`, async () => {
    const response = await fetch(`${base}/api/media`, {
      method,
      headers: { Origin: base, "Content-Type": "application/json" },
      ...(method === "GET" ? {} : { body: "{}" }),
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: "Google sign-in required.",
    });
  });
}
test("generation cannot be called anonymously", async () => {
  const r = await fetch(`${base}/api/generate`, { method: "POST" });
  assert.equal(r.status, 401);
});
test("invalid callback cannot create an authenticated session", async () => {
  const r = await fetch(`${base}/auth/callback?error=denied`, {
    redirect: "manual",
  });
  assert.equal(r.status, 303);
  assert.equal(new URL(r.headers.get("location"), base).pathname, "/login");
});
test("cross-origin signout is rejected", async () => {
  const r = await fetch(`${base}/auth/signout`, {
    method: "POST",
    headers: { origin: "https://untrusted.example" },
    redirect: "manual",
  });
  assert.equal(r.status, 403);
});
test("login wall is reachable and index-disabled", async () => {
  const r = await fetch(`${base}/login`);
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /Continue with Google/);
  assert.match(html, /noindex/);
  assert.doesNotMatch(html, /syc2153@|0921stanley@/);
});

for (const path of ['/images','/manage','/manage/prompt-chains','/manage/prompt-steps','/manage/prompt-mix','/manage/terms','/manage/examples','/manage/models','/manage/providers','/manage/requests','/manage/responses','/manage/signup-domains','/manage/email-whitelist']) {
 test(`new signed-out page ${path} redirects`, async () => { const r=await fetch(`${base}${path}`,{redirect:'manual'});assert.ok([303,307].includes(r.status));assert.equal(new URL(r.headers.get('location'),base).pathname,'/login'); });
}
for (const path of ['/api/images','/api/manage/terms','/api/manage/prompt-mix','/api/manage/providers','/api/manage/responses','/api/manage/not-a-table']) {
 for (const method of ['POST','PATCH','DELETE']) test(`signed-out ${method} ${path} denied`,async()=>{ const r=await fetch(`${base}${path}`,{method,headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,401); });
}
