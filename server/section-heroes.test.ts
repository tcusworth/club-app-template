import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Section Heroes", () => {
  beforeAll(async () => {
    // Ensure DB connection is ready
    await db.getDb();
  });

  describe("getSectionHero", () => {
    it("returns null for non-existent section key", async () => {
      const result = await db.getSectionHero("nonexistent_section_xyz");
      expect(result).toBeNull();
    });
  });

  describe("upsertSectionHero", () => {
    const testKey = `test_section_${Date.now()}`;

    it("creates a new section hero when none exists", async () => {
      const result = await db.upsertSectionHero(testKey, {
        heroImageUrl: "https://example.com/hero.jpg",
        title: "Test Section",
        subtitle: "A test subtitle",
        updatedByUserId: 1,
      });
      expect(result).toBeDefined();
      expect(result.sectionKey).toBe(testKey);
      expect(result.heroImageUrl).toBe("https://example.com/hero.jpg");
      expect(result.title).toBe("Test Section");
      expect(result.subtitle).toBe("A test subtitle");
    });

    it("retrieves the created section hero", async () => {
      const result = await db.getSectionHero(testKey);
      expect(result).not.toBeNull();
      expect(result!.sectionKey).toBe(testKey);
      expect(result!.heroImageUrl).toBe("https://example.com/hero.jpg");
      expect(result!.title).toBe("Test Section");
    });

    it("updates an existing section hero", async () => {
      const result = await db.upsertSectionHero(testKey, {
        heroImageUrl: "https://example.com/hero-v2.jpg",
        title: "Updated Title",
        subtitle: "Updated subtitle",
        updatedByUserId: 1,
      });
      expect(result.heroImageUrl).toBe("https://example.com/hero-v2.jpg");
      expect(result.title).toBe("Updated Title");
    });

    it("verifies the update persisted", async () => {
      const result = await db.getSectionHero(testKey);
      expect(result).not.toBeNull();
      expect(result!.heroImageUrl).toBe("https://example.com/hero-v2.jpg");
      expect(result!.title).toBe("Updated Title");
    });
  });

  describe("getAllSectionHeroes", () => {
    it("returns an array of section heroes", async () => {
      const result = await db.getAllSectionHeroes();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("deleteSectionHero", () => {
    const deleteKey = `test_delete_${Date.now()}`;

    it("creates and then deletes a section hero", async () => {
      await db.upsertSectionHero(deleteKey, {
        heroImageUrl: "https://example.com/to-delete.jpg",
      });
      const before = await db.getSectionHero(deleteKey);
      expect(before).not.toBeNull();

      await db.deleteSectionHero(deleteKey);
      const after = await db.getSectionHero(deleteKey);
      expect(after).toBeNull();
    });
  });
});
