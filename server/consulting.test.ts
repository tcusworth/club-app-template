import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

// Test user IDs — use a high ID range to avoid collisions
const TEST_SERVICE_IDS: number[] = [];
const TEST_INQUIRY_IDS: number[] = [];

describe("Consulting Services", () => {
  it("should list consulting services", async () => {
    const services = await db.listConsultingServices();
    expect(Array.isArray(services)).toBe(true);
  });

  it("should create a consulting service", async () => {
    const id = await db.createConsultingService({
      name: "Test Architecture Review",
      description: "A test service for unit tests",
      serviceType: "architecture_review",
      price: "0",
      duration: "1 week",
      maxSlotsPerMonth: 2,
    });
    expect(typeof id).toBe("number");
    TEST_SERVICE_IDS.push(id);
  });

  it("should retrieve a service by ID", async () => {
    const id = TEST_SERVICE_IDS[0];
    if (!id) return;
    const service = await db.getConsultingServiceById(id);
    expect(service).toBeDefined();
    expect(service?.name).toBe("Test Architecture Review");
    expect(service?.serviceType).toBe("architecture_review");
  });

  it("should update a consulting service", async () => {
    const id = TEST_SERVICE_IDS[0];
    if (!id) return;
    await db.updateConsultingService(id, { name: "Updated Architecture Review", isActive: false });
    const updated = await db.getConsultingServiceById(id);
    expect(updated?.name).toBe("Updated Architecture Review");
    expect(updated?.isActive).toBe(false);
  });

  it("should filter active services only", async () => {
    const allServices = await db.listConsultingServices(false);
    const activeServices = await db.listConsultingServices(true);
    // Active count should be <= total count
    expect(activeServices.length).toBeLessThanOrEqual(allServices.length);
  });
});

describe("Consulting Inquiries", () => {
  let testServiceId: number;

  beforeAll(async () => {
    // Create a test service for inquiries
    testServiceId = await db.createConsultingService({
      name: "Inquiry Test Service",
      description: "Service for inquiry tests",
      serviceType: "custom_training",
      price: "0",
    });
    TEST_SERVICE_IDS.push(testServiceId);
  });

  it("should submit a consulting inquiry", async () => {
    const id = await db.submitConsultingInquiry({
      serviceId: testServiceId,
      userId: 1,
      email: "test@test-consulting.com",
      phone: "+1-555-0000",
      message: "Test inquiry message",
    });
    expect(typeof id).toBe("number");
    TEST_INQUIRY_IDS.push(id);
  });

  it("should list inquiries", async () => {
    const inquiries = await db.listConsultingInquiries();
    expect(Array.isArray(inquiries)).toBe(true);
  });

  it("should update inquiry status", async () => {
    const id = TEST_INQUIRY_IDS[0];
    if (!id) return;
    await db.updateConsultingInquiryStatus(id, "contacted", "Reached out via email");
    const inquiries = await db.listConsultingInquiries("contacted");
    const found = inquiries.find((i: any) => i.id === id);
    expect(found).toBeDefined();
    expect(found?.status).toBe("contacted");
  });

  it("should filter inquiries by status", async () => {
    const newInquiries = await db.listConsultingInquiries("new");
    const contactedInquiries = await db.listConsultingInquiries("contacted");
    // All returned items should match the requested status
    newInquiries.forEach((i: any) => expect(i.status).toBe("new"));
    contactedInquiries.forEach((i: any) => expect(i.status).toBe("contacted"));
  });
});

afterAll(async () => {
  // Clean up test data
  const dbConn = await db.getDb();
  if (!dbConn) return;
  const { consultingInquiries, consultingServices } = await import("../drizzle/schema");
  const { inArray } = await import("drizzle-orm");

  if (TEST_INQUIRY_IDS.length > 0) {
    await dbConn.delete(consultingInquiries).where(inArray(consultingInquiries.id, TEST_INQUIRY_IDS));
  }
  if (TEST_SERVICE_IDS.length > 0) {
    await dbConn.delete(consultingServices).where(inArray(consultingServices.id, TEST_SERVICE_IDS));
  }
});
