import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Phase 17 — Accessibility Remediation & Error Boundaries Regression Suite", () => {
  it("1. FooterSection newsletter button and input have explicit accessible labels", () => {
    const footerFile = path.join(process.cwd(), "src", "components", "storefront", "sections", "FooterSection.tsx");
    assert.ok(fs.existsSync(footerFile), "FooterSection.tsx must exist");
    const content = fs.readFileSync(footerFile, "utf8");

    assert.ok(
      content.includes('aria-label="Subscribe to newsletter"'),
      "Footer newsletter submit button must have aria-label='Subscribe to newsletter'"
    );
    assert.ok(
      content.includes('aria-label="Email address for newsletter"'),
      "Footer newsletter email input must have aria-label='Email address for newsletter'"
    );
  });

  it("2. AppointmentWebsiteView date picker and modal close have explicit accessible labels", () => {
    const apptFile = path.join(process.cwd(), "src", "components", "storefront", "AppointmentWebsiteView.tsx");
    assert.ok(fs.existsSync(apptFile), "AppointmentWebsiteView.tsx must exist");
    const content = fs.readFileSync(apptFile, "utf8");

    assert.ok(
      content.includes('htmlFor="appointment-date-select"'),
      "Date picker label must link to appointment-date-select"
    );
    assert.ok(
      content.includes('id="appointment-date-select"'),
      "Date input must have id='appointment-date-select'"
    );
    assert.ok(
      content.includes('aria-label="Select appointment date"'),
      "Date input must have aria-label='Select appointment date'"
    );
    assert.ok(
      content.includes('aria-label="Close policy details"'),
      "Policy details modal button must have aria-label='Close policy details'"
    );
  });

  it("3. Root error boundary and 404 handler exist and adhere to Next.js App Router contracts", () => {
    const notFoundFile = path.join(process.cwd(), "src", "app", "not-found.tsx");
    const errorFile = path.join(process.cwd(), "src", "app", "error.tsx");

    assert.ok(fs.existsSync(notFoundFile), "src/app/not-found.tsx must exist");
    assert.ok(fs.existsSync(errorFile), "src/app/error.tsx must exist");

    const notFoundContent = fs.readFileSync(notFoundFile, "utf8");
    const errorContent = fs.readFileSync(errorFile, "utf8");

    assert.ok(errorContent.includes('"use client"'), "error.tsx must be a client component");
    assert.ok(errorContent.includes("digest"), "error.tsx must accept digest error reference");
    assert.ok(notFoundContent.includes("Page Not Found"), "not-found.tsx must display clean 404 message");
  });
});
