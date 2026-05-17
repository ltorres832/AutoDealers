#!/usr/bin/env node
/**
 * HTTP smoke checks against deployed App Hosting URLs.
 * Override with env vars (e.g. in GitHub Actions secrets/vars).
 */

const DEFAULT_PUBLIC =
  process.env.SMOKE_PUBLIC_WEB_URL ||
  "https://public-web-app--autodealers-7f62e.us-central1.hosted.app";

const DEFAULT_ADMIN =
  process.env.SMOKE_ADMIN_URL ||
  "https://admin-app--autodealers-7f62e.us-central1.hosted.app";

const checks = [
  {
    name: "public landing-config",
    url: `${DEFAULT_PUBLIC}/api/public/landing-config`,
    minStatus: 200,
    maxStatus: 299,
  },
  {
    name: "public vehicles",
    url: `${DEFAULT_PUBLIC}/api/public/vehicles`,
    minStatus: 200,
    maxStatus: 299,
  },
  {
    name: "public promotions",
    url: `${DEFAULT_PUBLIC}/api/public/promotions`,
    minStatus: 200,
    maxStatus: 299,
  },
  {
    name: "admin health",
    url: `${DEFAULT_ADMIN}/api/health`,
    minStatus: 200,
    maxStatus: 299,
  },
];

async function main() {
  let failed = 0;
  for (const c of checks) {
    try {
      const res = await fetch(c.url, { method: "GET", redirect: "manual" });
      const ok = res.status >= c.minStatus && res.status <= c.maxStatus;
      if (!ok) {
        console.error(`FAIL ${c.name}: ${res.status} ${c.url}`);
        failed++;
      } else {
        console.log(`OK   ${c.name}: ${res.status}`);
      }
    } catch (e) {
      console.error(`FAIL ${c.name}: ${e?.message || e}`);
      failed++;
    }
  }
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
