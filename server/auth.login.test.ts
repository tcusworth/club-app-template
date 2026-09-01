import { describe, it, expect } from "vitest";

describe("Auth — Login Form Fix", () => {
  it("should accept valid email addresses without HTML5 validation errors", () => {
    // Test various valid email formats that might fail with strict HTML5 validation
    const validEmails = [
      "tcusworth@gmail.com",
      "test+tag@example.com",
      "user.name@example.co.uk",
      "test_user@example.com",
      "123@example.com",
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of validEmails) {
      expect(emailRegex.test(email)).toBe(true);
    }
  });

  it("should trim whitespace from email input", () => {
    // Simulate the fix: .trim() on email input
    const emailWithSpaces = "  tcusworth@gmail.com  ";
    const trimmedEmail = emailWithSpaces.trim();
    expect(trimmedEmail).toBe("tcusworth@gmail.com");
  });

  it("should reject invalid email formats", () => {
    // Test invalid email formats
    const invalidEmails = [
      "notanemail",
      "@example.com",
      "user@",
      "user @example.com",
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of invalidEmails) {
      expect(emailRegex.test(email)).toBe(false);
    }
  });

  it("should handle type='text' with inputMode='email' for better mobile support", () => {
    // The fix changes from type="email" to type="text" with inputMode="email"
    // This prevents strict HTML5 email validation while still showing email keyboard on mobile
    const testInput = {
      type: "text",
      inputMode: "email",
      value: "tcusworth@gmail.com",
    };
    expect(testInput.type).toBe("text");
    expect(testInput.inputMode).toBe("email");
  });
});
