/**
 * Per-deployment club configuration.
 *
 * This file is the client-side place to edit when cloning OCOS for a new
 * club — icon and onboarding copy live here. CLUB_NAME itself now lives in
 * shared/clubConfig.ts (re-exported below) so both this file and
 * server/email.ts read the same value — edit it there, not here.
 *
 * NOT covered by this file (out of scope for this pass):
 *  - `client/index.html`'s static <title> tag — can't read this file at
 *    build time; `main.tsx` sets the real tab title at runtime instead,
 *    but the static fallback should still be updated by hand per club.
 *  - The `platformRole` values below are also enforced server-side by a
 *    Zod enum in server/routers.ts and by a MySQL enum column in
 *    drizzle/schema.ts. Changing ROLES here alone is NOT enough — for a
 *    new club deployment, update all three in the same change, then run
 *    a migration. Roles are fixed per-deployment at clone time, not
 *    editable at runtime by a club admin.
 */

import type { LucideIcon } from "lucide-react";
import { Shield } from "lucide-react";
export { CLUB_NAME } from "@shared/clubConfig";

export const CLUB_ICON: LucideIcon = Shield;

/** Shown on Onboarding step 1. Keep in sync with the server-side enum — see note above. */
export const ONBOARDING_ROLES: ReadonlyArray<{
  value: string;
  label: string;
  desc: string;
}> = [
  { value: "owner_operator", label: "Owner / Operator", desc: "End-user responsible for plant operations and asset management" },
  { value: "epc_integrator", label: "EPC / Integrator", desc: "Engineering, procurement, and construction or system integration firm" },
  { value: "automation_engineer", label: "Automation Engineer", desc: "Technical professional designing and implementing control systems" },
  { value: "executive", label: "Executive", desc: "Capital decision maker evaluating investment in automation modernization" },
  { value: "vendor", label: "Vendor", desc: "Technology provider offering O-PAS compatible products or services" },
  { value: "analyst", label: "Analyst / Researcher", desc: "Industry analyst or academic researching open process automation" },
];

/** Shown once, above the role list, on the first onboarding step. */
export const ONBOARDING_WELCOME_MESSAGE =
  "Select your role to personalize your experience";

/**
 * Feature flags for OPA-specific tool modules that don't belong in a
 * generic club deployment (they're industrial-automation/O-PAS specific:
 * an RFP generator, an architecture builder, a vendor directory, etc.).
 *
 * Setting a flag to false hides the corresponding nav item (DashboardLayout)
 * AND unregisters the route entirely (App.tsx) — a disabled feature isn't
 * reachable by direct URL either, it falls through to the 404 route.
 *
 * This does NOT delete any code — the pages/routes still exist in the repo,
 * they're just not mounted for this deployment. Flip back to true for a
 * deployment that does want them (e.g. cloning for another industrial/
 * automation-adjacent group rather than a general-purpose club).
 */
export const FEATURES = {
  capabilities: true, // Capabilities / knowledge graph pages
  architectureBuilder: true, // /tools/architecture
  migrationPlanner: true, // /tools/migration
  rfpGenerator: true, // /tools/rfp
  projects: true, // /projects
  vendors: true, // /vendors — O-PAS compatible vendor directory
  roiCalculator: true, // /roi-calculator
  caseStudies: true, // sidebar "Resources" section
  benchmarking: true,
  consulting: true,
} as const;
