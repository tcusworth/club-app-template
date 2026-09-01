import { describe, it, expect } from "vitest";
import { buildWelcomeEmail } from "./email";

describe("Email Service — Resend Integration", () => {
  it("should have SMTP credentials configured", () => {
    expect(process.env.SMTP_HOST).toBe("smtp.resend.com");
    expect(process.env.SMTP_USER).toBe("resend");
    expect(process.env.SMTP_PASS).toBeDefined();
    expect(process.env.SMTP_FROM).toContain("OPAcommunity.com");
  });

  it("should build welcome email with correct structure", () => {
    const email = buildWelcomeEmail("Trevor");
    expect(email.subject).toContain("Welcome");
    expect(email.html).toContain("OPA Community");
    expect(email.html).toContain("Trevor");
    expect(email.text).toContain("Trevor");
  });

  it("should have valid email template structure", () => {
    const email = buildWelcomeEmail("Test User");
    expect(email.html).toContain("<!DOCTYPE html>");
    expect(email.html).toContain("OPA Community");
    expect(email.html).toContain("wrapper");
    expect(email.text).toBeDefined();
  });
});
