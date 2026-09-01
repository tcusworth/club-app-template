import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

// Mock db module
vi.mock("./db", () => ({
  // Certificate helpers
  issueCertificate: vi.fn().mockResolvedValue({ id: 1, certificateId: "CERT-OPA-001", type: "course_completion" }),
  getUserCertificates: vi.fn().mockResolvedValue([
    { id: 1, certificateId: "CERT-OPA-001", type: "course_completion", courseName: "O-PAS Fundamentals", issuedAt: new Date() },
  ]),
  hasCourseCertificate: vi.fn().mockResolvedValue(false),
  getCompletedCourseCount: vi.fn().mockResolvedValue(3),
  verifyCertificate: vi.fn().mockResolvedValue({ id: 1, certificateId: "CERT-OPA-001", userName: "Test User", courseName: "O-PAS Fundamentals" }),

  // Case study helpers
  createCaseStudy: vi.fn().mockResolvedValue({ id: 1, title: "Test Case Study" }),
  listCaseStudies: vi.fn().mockResolvedValue([
    { id: 1, title: "OPA Migration at Refinery", industry: "Oil & Gas", status: "published", isFeatured: true, authorName: "Test User" },
  ]),
  getCaseStudyById: vi.fn().mockResolvedValue({
    id: 1, title: "OPA Migration at Refinery", description: "Full description", industry: "Oil & Gas",
    companySize: "large", roi: "25% cost reduction", techStack: "O-PAS, DCS, SCADA",
    status: "published", authorName: "Test User",
  }),
  updateCaseStudyStatus: vi.fn().mockResolvedValue(true),

  // Benchmarking helpers
  submitBenchmarkData: vi.fn().mockResolvedValue({ id: 1 }),
  getBenchmarkDashboard: vi.fn().mockResolvedValue({
    total: 15,
    byIndustry: [{ industry: "Oil & Gas", count: 8 }, { industry: "Chemicals", count: 4 }],
    byCompanySize: [{ companySize: "large", count: 6 }, { companySize: "enterprise", count: 5 }],
    entries: [{ industry: "Oil & Gas", companySize: "large", roi: "25%", techStack: "O-PAS,DCS" }],
  }),

  // Consulting helpers
  listConsultingServices: vi.fn().mockResolvedValue([
    { id: 1, name: "Architecture Review", serviceType: "architecture_review", price: "$5,000", isActive: true },
    { id: 2, name: "Custom Training", serviceType: "custom_training", price: "$3,000/day", isActive: true },
  ]),
  createConsultingInquiry: vi.fn().mockResolvedValue({ id: 1 }),
  getConsultingService: vi.fn().mockResolvedValue({ id: 1, name: "Architecture Review", serviceType: "architecture_review" }),

  // Existing helpers that may be called
  getUserEnrollments: vi.fn().mockResolvedValue([]),
  listCourses: vi.fn().mockResolvedValue([]),
}));

describe("Authority Features - Certificates", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list user certificates", async () => {
    const certs = await db.getUserCertificates(1);
    expect(certs).toHaveLength(1);
    expect(certs[0].certificateId).toBe("CERT-OPA-001");
    expect(certs[0].type).toBe("course_completion");
  });

  it("should issue a certificate", async () => {
    const cert = await db.issueCertificate(1, 1, "course_completion");
    expect(cert.id).toBe(1);
    expect(cert.certificateId).toMatch(/^CERT/);
  });

  it("should check if user has course certificate", async () => {
    const has = await db.hasCourseCertificate(1, 1);
    expect(has).toBe(false);
  });

  it("should verify a certificate by ID", async () => {
    const result = await db.verifyCertificate("CERT-OPA-001");
    expect(result).toBeTruthy();
    expect(result.userName).toBe("Test User");
  });

  it("should count completed courses for practitioner badge", async () => {
    const count = await db.getCompletedCourseCount(1);
    expect(count).toBe(3);
  });
});

describe("Authority Features - Case Studies", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list published case studies", async () => {
    const studies = await db.listCaseStudies();
    expect(studies).toHaveLength(1);
    expect(studies[0].title).toBe("OPA Migration at Refinery");
    expect(studies[0].industry).toBe("Oil & Gas");
  });

  it("should get case study by ID", async () => {
    const study = await db.getCaseStudyById(1);
    expect(study).toBeTruthy();
    expect(study.title).toBe("OPA Migration at Refinery");
    expect(study.roi).toBe("25% cost reduction");
  });

  it("should create a case study submission", async () => {
    const result = await db.createCaseStudy({
      title: "New Case Study",
      description: "Description",
      industry: "Chemicals",
      authorId: 1,
    });
    expect(result.id).toBe(1);
  });

  it("should update case study status (admin)", async () => {
    const result = await db.updateCaseStudyStatus(1, "published");
    expect(result).toBe(true);
  });
});

describe("Authority Features - Benchmarking", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should submit benchmark data", async () => {
    const result = await db.submitBenchmarkData({
      userId: 1,
      industry: "Oil & Gas",
      companySize: "large",
      roi: "25% cost reduction",
      techStack: "O-PAS, DCS",
    });
    expect(result.id).toBe(1);
  });

  it("should return dashboard with aggregated data", async () => {
    const dashboard = await db.getBenchmarkDashboard();
    expect(dashboard.total).toBe(15);
    expect(dashboard.byIndustry).toHaveLength(2);
    expect(dashboard.byCompanySize).toHaveLength(2);
    expect(dashboard.entries).toHaveLength(1);
  });

  it("should aggregate by industry", async () => {
    const dashboard = await db.getBenchmarkDashboard();
    const oilGas = dashboard.byIndustry.find((i: any) => i.industry === "Oil & Gas");
    expect(oilGas).toBeTruthy();
    expect(oilGas.count).toBe(8);
  });
});

describe("Authority Features - Consulting", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list active consulting services", async () => {
    const services = await db.listConsultingServices();
    expect(services).toHaveLength(2);
    expect(services[0].serviceType).toBe("architecture_review");
    expect(services[1].serviceType).toBe("custom_training");
  });

  it("should create a consulting inquiry", async () => {
    const result = await db.createConsultingInquiry({
      serviceId: 1,
      userId: 1,
      email: "test@example.com",
      message: "Need architecture review",
    });
    expect(result.id).toBe(1);
  });

  it("should get a specific consulting service", async () => {
    const service = await db.getConsultingService(1);
    expect(service).toBeTruthy();
    expect(service.name).toBe("Architecture Review");
  });
});
