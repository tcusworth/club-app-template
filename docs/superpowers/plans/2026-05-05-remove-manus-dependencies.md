# Remove Manus Dependencies — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip every Manus runtime, OAuth, Forge-proxy, and incidental scaffolding artifact from OCOS. Replace LLM calls with the Anthropic SDK and storage with Cloudflare R2 via `@aws-sdk/client-s3`. Delete unused proxy-dependent features (maps, image generation, voice transcription, generic data API). After this plan: no `manus` strings remain in source, no Forge env vars exist, the app builds and runs against direct Anthropic + R2 + SMTP credentials.

**Architecture:**
- `invokeLLM` keeps its current signature so the 5 callers in `server/routers.ts` don't change; the implementation is rewritten to use `@anthropic-ai/sdk` with `claude-sonnet-4-5`. We translate the OpenAI-style `messages`/`tool_calls`/`response_format` shape into Anthropic's shape inside `llm.ts`.
- `storagePut` / `storageGet` keep their current signatures; the implementation switches to S3 PutObject + presigned GET against R2.
- `notifyOwner` becomes an SMTP email send to `OWNER_EMAIL` (via the existing nodemailer transport). All call sites stay unchanged.
- Manus OAuth is fully retired. The custom email/password auth (already shipped) becomes the only login path. `sdk.ts` is shrunk to just JWT session helpers.

**Tech Stack:** `@anthropic-ai/sdk` (new — install), `@aws-sdk/client-s3` (already installed), `@aws-sdk/s3-request-presigner` (already installed), nodemailer (already wired), node-fetch via global fetch.

---

## Decisions to confirm before execution

These are choices I made interpreting your spec — flag any you want changed:

1. **`server/_core/notification.ts` (`notifyOwner`)** — currently posts to the Forge "SendNotification" endpoint. You didn't name it explicitly, but it depends on `BUILT_IN_FORGE_*` which you're removing. **Proposal:** rewrite as an SMTP email send to a new `OWNER_EMAIL` env var (using the existing nodemailer transport from `server/email.ts`); fall back to console.log when `OWNER_EMAIL` is unset. This keeps the 8 call sites in `routers.ts`, `workflows.ts`, and `digestCron.ts` working without code churn at the call sites. Alternative: delete `notifyOwner` and remove all call sites (more invasive).

2. **`server/_core/dataApi.ts`** — generic Forge proxy for "Data APIs" (YouTube search, etc.). No live callers in the repo. **Proposal:** delete.

3. **`client/src/components/Map.tsx`** — frontend Google Maps loader that uses `VITE_FRONTEND_FORGE_API_KEY` / `VITE_FRONTEND_FORGE_API_URL`. Not imported anywhere. You said remove maps — **proposal:** delete this file too.

4. **`@types/google.maps`** in `package.json` devDependencies — only useful for `Map.tsx`. **Proposal:** uninstall.

5. **`axios`** — only used by `server/_core/sdk.ts` for the OAuth HTTP client. Once OAuth is gone, axios has no callers. **Proposal:** uninstall.

6. **`server/_core/sdk.ts`** — has dual concerns. Keep: `signSession`, `verifySession`, `authenticateRequest`, `createSessionToken` (used by email/password auth). Drop: `OAuthService`, `exchangeCodeForToken`, `getUserInfo`, `getUserInfoWithJwt`, axios client, `manusTypes` import, `appId` config. **Proposal:** rewrite the file in-place rather than splitting into a new module — keeps the `sdk.authenticateRequest()` import in `server/_core/context.ts` (and elsewhere) stable.

7. **Default Anthropic model:** `claude-sonnet-4-5` per your spec. The existing `llm.ts` ignored a model parameter and hardcoded `gemini-2.5-flash`; the new version will default to sonnet 4.5 and accept an optional override.

8. **Hardcoded URL fallbacks:** every `https://opacom-os-mc9rs5av.manus.space` becomes `http://localhost:3000`. The real prod URL ships via `APP_BASE_URL`.

9. **Test fixtures with `loginMethod: "manus"`:** changed to `"email"`. (4 occurrences across 3 files.)

10. **No new tests** are required by this plan — the refactor preserves call-site behavior. Existing tests (~230) are the regression net. If `pnpm test` passes after each commit, we're good. If you want a smoke test for R2 connectivity, say so and I'll add a vitest.

---

## Complete file map

### Delete (10 files)

- `client/public/__manus__/debug-collector.js` — Manus runtime browser collector
- `client/public/__manus__/` — empty folder after the .js delete (rm -rf)
- `client/src/components/ManusDialog.tsx` — orphan "Login with Manus" dialog (no importers)
- `client/src/components/Map.tsx` — orphan Google Maps frontend loader
- `server/_core/oauth.ts` — Manus OAuth callback route (`/api/oauth/callback`)
- `server/_core/types/manusTypes.ts` — Manus protobuf types
- `server/_core/dataApi.ts` — Forge "WebDevService" generic proxy (no callers)
- `server/_core/imageGeneration.ts` — Forge image generation proxy (no callers)
- `server/_core/voiceTranscription.ts` — Forge Whisper proxy (no callers)
- `server/_core/map.ts` — Forge Google Maps proxy (no callers)

### Rewrite (4 files)

- `server/_core/llm.ts` — Forge fetch → `@anthropic-ai/sdk`. Public `invokeLLM(params)` shape preserved. Default model `claude-sonnet-4-5`.
- `server/storage.ts` — Forge HTTP storage proxy → `@aws-sdk/client-s3` `PutObjectCommand` + `@aws-sdk/s3-request-presigner` `getSignedUrl`. Public `storagePut` / `storageGet` shape preserved.
- `server/_core/notification.ts` — Forge HTTP send → SMTP email to `OWNER_EMAIL` (uses existing nodemailer config). Public `notifyOwner(payload)` shape preserved.
- `server/_core/sdk.ts` — Strip OAuth/axios/manusTypes; keep JWT session helpers. Public exports `sdk.signSession`, `sdk.verifySession`, `sdk.authenticateRequest`, `sdk.createSessionToken` preserved.

### Modify (10 files)

- `server/_core/env.ts` — drop `appId`, `oAuthServerUrl`, `ownerOpenId`, `forgeApiUrl`, `forgeApiKey`. Add `anthropicApiKey`, `r2AccountId`, `r2AccessKeyId`, `r2SecretAccessKey`, `r2Bucket`, `r2Endpoint`, `ownerEmail`, `appBaseUrl`.
- `server/_core/index.ts` — remove `import { registerOAuthRoutes } from "./oauth"` (line 6) and `registerOAuthRoutes(app)` call (line 72).
- `server/workflows.ts` — replace manus.space fallback (line 90) with `http://localhost:3000`.
- `server/digestCron.ts` — replace fallback chain (lines 41–45). Use `process.env.APP_BASE_URL ?? "http://localhost:3000"` (drop `VITE_OAUTH_PORTAL_URL`).
- `server/eventReminderCron.ts` — replace fallback (lines 126–128) with `process.env.APP_BASE_URL ?? "http://localhost:3000"`.
- `server/digest-email.test.ts` — replace test fixture URL (line 21) with `http://localhost:3000`.
- `server/auth.logout.test.ts` — `loginMethod: "manus"` → `"email"` (line 21).
- `server/ocos.test.ts` — `loginMethod: "manus"` → `"email"` (line 17).
- `server/content-crud.test.ts` — `loginMethod: "manus"` → `"email"` (lines 13 and 38).
- `client/src/_core/hooks/useAuth.ts` — remove `localStorage.setItem("manus-runtime-user-info", …)` (lines 44–47).
- `client/src/const.ts` — delete `getLoginUrl` (lines 4–24); keep the `COOKIE_NAME` re-export.
- `vite.config.ts` — strip Manus debug collector plugin block (entire lines 9–151), remove `vite-plugin-manus-runtime` import + plugin registration, remove 5 `.manus*.computer` allowedHosts entries.
- `.gitignore` — remove lines 112–113 (`# Manus version file` comment + `client/public/__manus__/version.json`).
- `package.json` — remove `vite-plugin-manus-runtime` from devDependencies, `@types/google.maps`, `axios`. Add `@anthropic-ai/sdk`.

### Move (5 files into `docs/manus-archive/`)

- `screenshot_notes.md` → `docs/manus-archive/screenshot_notes.md`
- `screenshot_notes2.md` → `docs/manus-archive/screenshot_notes2.md`
- `screenshot_notes3.md` → `docs/manus-archive/screenshot_notes3.md`
- `screenshot_notes4.md` → `docs/manus-archive/screenshot_notes4.md`
- `verification_notes.md` → `docs/manus-archive/verification_notes.md`
- `screenshot_review.md` → `docs/manus-archive/screenshot_review.md`

---

## Commit groups

12 commits total. Each group ends with `pnpm check && pnpm test` before commit. Commits are independently revertable.

---

### Commit 1: Archive Manus working notes

**Files:**
- Create: `docs/manus-archive/` (directory)
- Move: 6 markdown files from repo root

- [ ] **Step 1: Create archive folder and move files**

```bash
mkdir -p docs/manus-archive
git mv screenshot_notes.md docs/manus-archive/
git mv screenshot_notes2.md docs/manus-archive/
git mv screenshot_notes3.md docs/manus-archive/
git mv screenshot_notes4.md docs/manus-archive/
git mv verification_notes.md docs/manus-archive/
git mv screenshot_review.md docs/manus-archive/
```

- [ ] **Step 2: Verify root is clean**

Run: `ls *.md`
Expected: only `CLAUDE.md` and `todo.md` (plus `README.md` if present).

- [ ] **Step 3: Commit**

```bash
git add docs/manus-archive
git commit -m "Archive Manus working notes under docs/manus-archive/"
```

---

### Commit 2: Remove Manus debug collector

**Files:**
- Delete: `client/public/__manus__/debug-collector.js`
- Delete: `client/public/__manus__/` (empty parent dir)
- Modify: `vite.config.ts` (drop plugin block + middleware)
- Modify: `.gitignore` (drop manus version file entry)

- [ ] **Step 1: Delete the browser debug script and folder**

```bash
git rm client/public/__manus__/debug-collector.js
rmdir client/public/__manus__ 2>/dev/null || true
```

- [ ] **Step 2: Strip the Manus debug collector plugin block from `vite.config.ts`**

In `vite.config.ts`:
- Remove lines 9–151 (the entire `// Manus Debug Collector …` comment header, `LOG_DIR`, `MAX_LOG_SIZE_BYTES`, `TRIM_TARGET_BYTES`, `LogSource` type, `ensureLogDir`, `trimLogFile`, `writeToLogFile`, and `vitePluginManusDebugCollector` function).
- In the `plugins` array (line 153), remove `vitePluginManusDebugCollector()`.
- Remove the unused `fs` and `path` imports if no other code uses them. (`path` is used elsewhere in the file for aliases, so keep `path`. `fs` becomes unused — remove.)

The new top of `vite.config.ts` should be:

```ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];

export default defineConfig({
  plugins,
  // … rest unchanged for now (manus-runtime + allowedHosts cleaned up in commit 3)
});
```

- [ ] **Step 3: Remove the Manus version-file gitignore entry**

In `.gitignore`, remove lines 112–113:

```
# Manus version file (auto-generated, not part of source)
client/public/__manus__/version.json
```

- [ ] **Step 4: Verify dev server still boots**

Run: `pnpm dev` (briefly) — confirm server starts without errors. Stop it.

- [ ] **Step 5: Run typecheck**

Run: `pnpm check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts .gitignore client/public
git commit -m "Remove Manus debug collector and __manus__ public asset"
```

---

### Commit 3: Remove vite-plugin-manus-runtime and Manus allowedHosts

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Strip the manus-runtime import and registration from `vite.config.ts`**

Remove the import:
```ts
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
```

In the `plugins` array, remove `vitePluginManusRuntime()`. Final plugins line:
```ts
const plugins = [react(), tailwindcss(), jsxLocPlugin()];
```

- [ ] **Step 2: Strip Manus allowedHosts**

In `vite.config.ts`, replace the `allowedHosts` array (lines ~173–181):

Before:
```ts
allowedHosts: [
  ".manuspre.computer",
  ".manus.computer",
  ".manus-asia.computer",
  ".manuscomputer.ai",
  ".manusvm.computer",
  "localhost",
  "127.0.0.1",
],
```

After:
```ts
allowedHosts: ["localhost", "127.0.0.1"],
```

- [ ] **Step 3: Remove `vite-plugin-manus-runtime` from `package.json` devDependencies**

Remove line 120: `"vite-plugin-manus-runtime": "^0.0.57",`

- [ ] **Step 4: Reinstall to update lockfile**

Run: `pnpm install`
Expected: `vite-plugin-manus-runtime` removed from `pnpm-lock.yaml`.

- [ ] **Step 5: Boot the dev server to confirm**

Run: `pnpm dev` briefly. Stop after confirming startup is clean.

- [ ] **Step 6: Run typecheck and tests**

Run: `pnpm check && pnpm test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add vite.config.ts package.json pnpm-lock.yaml
git commit -m "Remove vite-plugin-manus-runtime and Manus allowedHosts"
```

---

### Commit 4: Replace hardcoded manus.space URLs with localhost fallback

**Files:**
- Modify: `server/workflows.ts:90`
- Modify: `server/digestCron.ts:41–45`
- Modify: `server/eventReminderCron.ts:126–128`
- Modify: `server/digest-email.test.ts:21`

- [ ] **Step 1: Update `server/workflows.ts` line 90**

Before:
```ts
const BASE_URL = process.env.APP_BASE_URL ?? "https://opacom-os-mc9rs5av.manus.space";
```

After:
```ts
const BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";
```

- [ ] **Step 2: Update `server/digestCron.ts` lines 41–45**

Before:
```ts
const baseUrl =
  process.env.VITE_APP_URL ||
  process.env.VITE_OAUTH_PORTAL_URL?.replace("/portal", "") ||
  "https://opacom-os-mc9rs5av.manus.space";
```

After:
```ts
const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
```

- [ ] **Step 3: Update `server/eventReminderCron.ts` lines 126–128**

Before:
```ts
const baseUrl = process.env.VITE_OAUTH_PORTAL_URL
  ? process.env.VITE_OAUTH_PORTAL_URL.replace(/\/oauth.*/, "")
  : "https://opacom-os-mc9rs5av.manus.space";
```

After:
```ts
const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
```

- [ ] **Step 4: Update `server/digest-email.test.ts` line 21**

Before:
```ts
baseUrl: "https://opacom-os.manus.space",
```

After:
```ts
baseUrl: "http://localhost:3000",
```

- [ ] **Step 5: Verify no manus.space remains**

Run grep for `manus.space` — should find zero matches.

- [ ] **Step 6: Run tests**

Run: `pnpm test`
Expected: all pass (digest-email tests should re-pass with new fixture URL).

- [ ] **Step 7: Commit**

```bash
git add server/workflows.ts server/digestCron.ts server/eventReminderCron.ts server/digest-email.test.ts
git commit -m "Replace manus.space URL fallbacks with localhost; standardize on APP_BASE_URL"
```

---

### Commit 5: Update test fixtures from loginMethod: "manus" to "email"

**Files:**
- Modify: `server/auth.logout.test.ts:21`
- Modify: `server/ocos.test.ts:17`
- Modify: `server/content-crud.test.ts:13` and `:38`

- [ ] **Step 1: Update each fixture**

In all 4 occurrences across the 3 files, change:
```ts
loginMethod: "manus",
```
to:
```ts
loginMethod: "email",
```

- [ ] **Step 2: Run tests**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add server/auth.logout.test.ts server/ocos.test.ts server/content-crud.test.ts
git commit -m "Update test fixtures to use loginMethod: \"email\""
```

---

### Commit 6: Delete orphan Manus features (maps, image gen, voice, dataApi, ManusDialog, frontend Map)

**Files:**
- Delete: `server/_core/map.ts`
- Delete: `server/_core/imageGeneration.ts`
- Delete: `server/_core/voiceTranscription.ts`
- Delete: `server/_core/dataApi.ts`
- Delete: `client/src/components/ManusDialog.tsx`
- Delete: `client/src/components/Map.tsx`
- Modify: `package.json` (remove `@types/google.maps`)

- [ ] **Step 1: Delete server-side proxy modules**

```bash
git rm server/_core/map.ts server/_core/imageGeneration.ts server/_core/voiceTranscription.ts server/_core/dataApi.ts
```

- [ ] **Step 2: Delete client-side orphan components**

```bash
git rm client/src/components/ManusDialog.tsx client/src/components/Map.tsx
```

- [ ] **Step 3: Verify no live importers**

Run: grep for `imageGeneration|voiceTranscription|callDataApi|ManusDialog|MapView` across `client/` and `server/`. Expected: zero matches outside the deleted files.

- [ ] **Step 4: Remove `@types/google.maps` from `package.json` devDependencies**

Remove line: `"@types/google.maps": "^3.58.1",`

- [ ] **Step 5: Reinstall**

Run: `pnpm install`

- [ ] **Step 6: Typecheck and tests**

Run: `pnpm check && pnpm test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add -u server/_core client/src/components package.json pnpm-lock.yaml
git commit -m "Remove orphan Manus features: maps, image gen, voice, dataApi, ManusDialog"
```

---

### Commit 7: Replace Forge LLM with Anthropic SDK

**Files:**
- Install: `@anthropic-ai/sdk`
- Rewrite: `server/_core/llm.ts`
- Modify: `server/_core/env.ts` (add `anthropicApiKey`)

- [ ] **Step 1: Install the Anthropic SDK**

```bash
pnpm add @anthropic-ai/sdk
```

- [ ] **Step 2: Add `anthropicApiKey` to `server/_core/env.ts`**

Add to the `ENV` object:
```ts
anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
```

(We'll do the full env.ts cleanup in commit 11.)

- [ ] **Step 3: Rewrite `server/_core/llm.ts`**

Replace the whole file with an Anthropic SDK-backed implementation that preserves the existing public types (`Message`, `InvokeParams`, `InvokeResult`, `Tool`, `ToolChoice`, `ResponseFormat`, `OutputSchema`) so the 5 callers in `server/routers.ts` (lines 569, 643, 723, 783, 1908) need no changes.

```ts
import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = { type: "text"; text: string };
export type ImageContent = {
  type: "image_url";
  image_url: { url: string; detail?: "auto" | "low" | "high" };
};
export type FileContent = {
  type: "file_url";
  file_url: { url: string; mime_type?: string };
};
export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: { name: string };
};
export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};
export type OutputSchema = JsonSchema;
export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

const DEFAULT_MODEL = "claude-sonnet-4-5";
const DEFAULT_MAX_TOKENS = 32_768;

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!ENV.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: ENV.anthropicApiKey });
  }
  return _client;
}

function extractText(content: Message["content"]): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map(c => (typeof c === "string" ? c : c.type === "text" ? c.text : ""))
      .join("\n");
  }
  if (content.type === "text") return content.text;
  return "";
}

type AnthropicMessageParam = {
  role: "user" | "assistant";
  content: string;
};

function toAnthropicShape(messages: Message[]): {
  system: string | undefined;
  messages: AnthropicMessageParam[];
} {
  const systemParts: string[] = [];
  const out: AnthropicMessageParam[] = [];
  for (const m of messages) {
    const text = extractText(m.content);
    if (m.role === "system") {
      systemParts.push(text);
      continue;
    }
    if (m.role === "tool" || m.role === "function") {
      // Surface tool results as user-side context.
      out.push({ role: "user", content: `[tool result] ${text}` });
      continue;
    }
    if (m.role === "user" || m.role === "assistant") {
      out.push({ role: m.role, content: text });
    }
  }
  return {
    system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
    messages: out,
  };
}

function jsonSchemaInstruction(
  responseFormat?: ResponseFormat,
  outputSchema?: OutputSchema
): string | undefined {
  const fmt = responseFormat;
  const schema = outputSchema ?? (fmt && fmt.type === "json_schema" ? fmt.json_schema : undefined);
  if (fmt?.type === "json_object" && !schema) {
    return "Respond with a single valid JSON object. No prose, no markdown fences.";
  }
  if (schema) {
    return `Respond with a single valid JSON object matching this JSON Schema (no prose, no markdown fences):\n${JSON.stringify(
      schema.schema
    )}`;
  }
  return undefined;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const client = getClient();
  const { system, messages } = toAnthropicShape(params.messages);

  const formatHint = jsonSchemaInstruction(
    params.responseFormat ?? params.response_format,
    params.outputSchema ?? params.output_schema
  );

  const finalSystem = [system, formatHint].filter(Boolean).join("\n\n") || undefined;

  const response = await client.messages.create({
    model: params.model ?? DEFAULT_MODEL,
    max_tokens: params.maxTokens ?? params.max_tokens ?? DEFAULT_MAX_TOKENS,
    system: finalSystem,
    messages,
  });

  const textBlocks = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text);
  const text = textBlocks.join("\n");

  return {
    id: response.id,
    created: Math.floor(Date.now() / 1000),
    model: response.model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: response.stop_reason ?? null,
      },
    ],
    usage: response.usage
      ? {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens,
        }
      : undefined,
  };
}
```

**Note on tool calling:** the original `llm.ts` accepted `tools` and `tool_choice` params, but the routers.ts callers (verified: lines 569, 643, 723, 783, 1908) all use `messages` + (optionally) `outputSchema` for JSON output — no actual tool calls. So this rewrite handles JSON-schema responses via system-prompt instruction. If a future caller needs Anthropic-native tool use, we'll add it then. (YAGNI.)

- [ ] **Step 4: Run typecheck**

Run: `pnpm check`
Expected: no errors. The 5 router callers compile against the preserved `invokeLLM` signature.

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: all pass. Tests that hit `invokeLLM` either mock it or hit a real network (unlikely in vitest); if network tests exist and now fail because `ANTHROPIC_API_KEY` is unset, set it via your shell or `.env` and re-run.

- [ ] **Step 6: Manual smoke test**

In a scratch script or via the running app: hit one of the AI endpoints (e.g., `ai.evaluateClaim` or the migration plan generator). Confirm a real Anthropic response comes back.

- [ ] **Step 7: Commit**

```bash
git add server/_core/llm.ts server/_core/env.ts package.json pnpm-lock.yaml
git commit -m "Replace Forge LLM proxy with @anthropic-ai/sdk (claude-sonnet-4-5)"
```

---

### Commit 8: Replace Forge storage proxy with Cloudflare R2

**Files:**
- Rewrite: `server/storage.ts`
- Modify: `server/_core/env.ts` (add R2 vars)

- [ ] **Step 1: Add R2 env vars to `server/_core/env.ts`**

Add to the `ENV` object:
```ts
r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
r2Bucket: process.env.R2_BUCKET ?? "",
r2Endpoint: process.env.R2_ENDPOINT ?? "",
```

- [ ] **Step 2: Rewrite `server/storage.ts`**

Replace the entire file:

```ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

let _client: S3Client | null = null;

function getClient(): { client: S3Client; bucket: string } {
  const { r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2Bucket, r2Endpoint } = ENV;
  if (!r2AccessKeyId || !r2SecretAccessKey || !r2Bucket) {
    throw new Error(
      "R2 storage credentials missing: set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET (and optionally R2_ENDPOINT or R2_ACCOUNT_ID)"
    );
  }
  const endpoint =
    r2Endpoint ||
    (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : "");
  if (!endpoint) {
    throw new Error("R2 endpoint missing: set R2_ENDPOINT or R2_ACCOUNT_ID");
  }
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    });
  }
  return { client: _client, bucket: r2Bucket };
}

function normalizeKey(key: string): string {
  return key.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { client, bucket } = getClient();
  const key = normalizeKey(relKey);
  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  // Presigned GET URL — 7 day expiry to match common UX. Adjust if you front R2 with a public custom domain.
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 60 * 60 * 24 * 7 }
  );
  return { key, url };
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const { client, bucket } = getClient();
  const key = normalizeKey(relKey);
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 60 * 60 * 24 * 7 }
  );
  return { key, url };
}
```

- [ ] **Step 3: Confirm no other code imports from `server/storage`**

Run: grep for `from.*server/storage|from.*"\\./storage"`. Expected callers: `server/routers.ts:8` only (after we deleted `imageGeneration.ts` in commit 6).

- [ ] **Step 4: Add a real R2 smoke test**

Create `server/storage.smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { storagePut, storageGet } from "./storage";
import { ENV } from "./_core/env";

const HAS_R2 = Boolean(
  ENV.r2AccessKeyId && ENV.r2SecretAccessKey && ENV.r2Bucket && (ENV.r2Endpoint || ENV.r2AccountId)
);

describe.skipIf(!HAS_R2)("R2 storage smoke test", () => {
  it("uploads, fetches via presigned URL, and deletes a file", async () => {
    const key = `smoke-test/${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
    const payload = `hello-r2-${Date.now()}`;

    const put = await storagePut(key, payload, "text/plain");
    expect(put.key).toBe(key);
    expect(put.url).toMatch(/^https?:\/\//);

    const get = await storageGet(key);
    expect(get.key).toBe(key);

    const fetched = await fetch(get.url);
    expect(fetched.ok).toBe(true);
    expect(await fetched.text()).toBe(payload);

    const endpoint =
      ENV.r2Endpoint ||
      (ENV.r2AccountId ? `https://${ENV.r2AccountId}.r2.cloudflarestorage.com` : "");
    const cleanup = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: ENV.r2AccessKeyId,
        secretAccessKey: ENV.r2SecretAccessKey,
      },
    });
    await cleanup.send(new DeleteObjectCommand({ Bucket: ENV.r2Bucket, Key: key }));
  }, 30_000);
});
```

The test auto-skips when R2 env vars are not set, so CI without secrets won't break.

- [ ] **Step 5: Typecheck and tests**

Run: `pnpm check && pnpm test`
Expected: all pass. With R2 env vars set, the smoke test runs and verifies upload/fetch/delete; without them, it auto-skips.

- [ ] **Step 6: Commit**

```bash
git add server/storage.ts server/_core/env.ts server/storage.smoke.test.ts
git commit -m "Replace Forge storage proxy with Cloudflare R2 via @aws-sdk/client-s3"
```

---

### Commit 9: Rewrite notifyOwner to send via SMTP

**Files:**
- Rewrite: `server/_core/notification.ts`
- Modify: `server/_core/env.ts` (add `ownerEmail`)

- [ ] **Step 1: Add `ownerEmail` to `server/_core/env.ts`**

```ts
ownerEmail: process.env.OWNER_EMAIL ?? "",
```

- [ ] **Step 2: Rewrite `server/_core/notification.ts`**

Replace the file:

```ts
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";
import { sendMail } from "../email";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20_000;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

function validatePayload(input: NotificationPayload): NotificationPayload {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title is required." });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification content is required." });
  }
  const title = input.title.trim();
  const content = input.content.trim();
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }
  return { title, content };
}

/**
 * Send an owner-facing notification. If OWNER_EMAIL is set, delivers via SMTP;
 * otherwise logs to the console. Returns true when delivery (or logging) succeeded.
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  if (!ENV.ownerEmail) {
    console.log(`[notifyOwner] (OWNER_EMAIL unset) ${title} — ${content}`);
    return true;
  }

  try {
    await sendMail({
      to: ENV.ownerEmail,
      subject: title,
      text: content,
      html: `<p>${content.replace(/\n/g, "<br/>")}</p>`,
    });
    return true;
  } catch (error) {
    console.warn("[notifyOwner] SMTP send failed:", error);
    return false;
  }
}
```

**Note:** verify `sendMail` (or equivalent named export) exists in `server/email.ts`. If the existing helper is named differently (e.g., `sendEmail`), adjust the import. Check during implementation — if needed, add a thin `sendMail` wrapper.

- [ ] **Step 3: Verify all 8 call sites still compile**

The signature of `notifyOwner({ title, content })` is unchanged. Callers in `server/routers.ts` (5×), `server/workflows.ts` (2×), and `server/digestCron.ts` (1×) need no edits.

- [ ] **Step 4: Typecheck and tests**

Run: `pnpm check && pnpm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add server/_core/notification.ts server/_core/env.ts
git commit -m "Rewrite notifyOwner to send via SMTP (OWNER_EMAIL) instead of Forge"
```

---

### Commit 10: Remove Manus OAuth scaffolding

**Files:**
- Delete: `server/_core/oauth.ts`
- Delete: `server/_core/types/manusTypes.ts`
- Rewrite: `server/_core/sdk.ts` (keep only JWT session helpers)
- Modify: `server/_core/index.ts` (drop `registerOAuthRoutes`)
- Modify: `client/src/_core/hooks/useAuth.ts` (drop manus-runtime localStorage)
- Modify: `client/src/const.ts` (drop `getLoginUrl`)
- Modify: `package.json` (remove `axios`)

- [ ] **Step 1: Rewrite `server/_core/sdk.ts`**

Replace the file with a slim, JWT-only version:

```ts
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  name: string;
};

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      { openId, name: options.name || "" },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({ openId: payload.openId, name: payload.name })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; name: string } | null> {
    if (!cookieValue) return null;
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, name } = payload as Record<string, unknown>;
      if (!isNonEmptyString(openId) || !isNonEmptyString(name)) return null;
      return { openId, name };
    } catch (error) {
      console.warn("[Auth] Session verification failed:", String(error));
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const user = await db.getUserByOpenId(session.openId);
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
    return user;
  }
}

export const sdk = new SDKServer();
```

**Behavior change:** the old `authenticateRequest` would auto-sync a user from the OAuth server if the local DB row was missing. With OAuth gone, a missing user is now an error — which is correct, because the email/password registration flow is the only way to create users.

The `appId` field is dropped from `SessionPayload` because it was Manus-specific. **Verify** no test or call site reads `session.appId`. (Spot check during implementation.)

- [ ] **Step 2: Delete the OAuth route module and Manus types**

```bash
git rm server/_core/oauth.ts server/_core/types/manusTypes.ts
```

- [ ] **Step 3: Update `server/_core/index.ts`**

Remove line 6:
```ts
import { registerOAuthRoutes } from "./oauth";
```

Remove line 71–72:
```ts
// OAuth callback under /api/oauth/callback
registerOAuthRoutes(app);
```

- [ ] **Step 4: Update `client/src/_core/hooks/useAuth.ts`**

Remove lines 44–47 (the `localStorage.setItem("manus-runtime-user-info", …)` block) inside the `useMemo`. The new memo body:
```ts
const state = useMemo(() => {
  return {
    user: meQuery.data ?? null,
    loading: meQuery.isLoading || logoutMutation.isPending,
    error: meQuery.error ?? logoutMutation.error ?? null,
    isAuthenticated: Boolean(meQuery.data),
  };
}, [
  meQuery.data,
  meQuery.error,
  meQuery.isLoading,
  logoutMutation.error,
  logoutMutation.isPending,
]);
```

- [ ] **Step 5: Trim `client/src/const.ts`**

Replace the whole file with just the re-export:
```ts
export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
```

- [ ] **Step 6: Confirm no `getLoginUrl` callers remain**

Run: grep for `getLoginUrl`. Expected: zero matches (the `todo.md` Apr 12 entry says all `getLoginUrl` references were already replaced with `/signin` / `/register` buttons).

- [ ] **Step 7: Remove `axios` from `package.json` dependencies**

Remove line: `"axios": "^1.12.0",`

- [ ] **Step 8: Reinstall**

Run: `pnpm install`

- [ ] **Step 9: Typecheck and tests**

Run: `pnpm check && pnpm test`
Expected: all pass. If any test references `sdk.exchangeCodeForToken` or `sdk.getUserInfo`, it needs updating — but a quick scan should confirm those exports were unused outside `oauth.ts` (now deleted).

- [ ] **Step 10: Boot the app**

Run: `pnpm dev`. Confirm:
- /signin and /register pages still load
- A real login (existing user) succeeds and the session cookie persists
- /api/oauth/callback is now 404 (expected)

- [ ] **Step 11: Commit**

```bash
git add -u server/_core client/src package.json pnpm-lock.yaml
git commit -m "Remove Manus OAuth scaffolding; slim sdk.ts to JWT session helpers"
```

---

### Commit 11: Final env.ts cleanup

**Files:**
- Modify: `server/_core/env.ts`

- [ ] **Step 1: Replace `server/_core/env.ts` with the final version**

```ts
export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",

  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2Bucket: process.env.R2_BUCKET ?? "",
  r2Endpoint: process.env.R2_ENDPOINT ?? "",

  ownerEmail: process.env.OWNER_EMAIL ?? "",
};
```

This drops `appId`, `oAuthServerUrl`, `ownerOpenId`, `forgeApiUrl`, `forgeApiKey` permanently.

- [ ] **Step 2: Verify nothing reads the dropped fields**

Run: grep for `ENV.appId|ENV.oAuthServerUrl|ENV.ownerOpenId|ENV.forgeApiUrl|ENV.forgeApiKey`. Expected: zero matches.

- [ ] **Step 3: Verify nothing reads the dropped env vars directly via `process.env`**

Run: grep for `VITE_APP_ID|OAUTH_SERVER_URL|OWNER_OPEN_ID|BUILT_IN_FORGE_API_URL|BUILT_IN_FORGE_API_KEY|VITE_OAUTH_PORTAL_URL|VITE_FRONTEND_FORGE_API_KEY|VITE_FRONTEND_FORGE_API_URL`. Expected: zero matches.

- [ ] **Step 4: Typecheck and tests**

Run: `pnpm check && pnpm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add server/_core/env.ts
git commit -m "Final env.ts cleanup: drop all Manus/Forge env vars"
```

---

### Commit 12: Documentation update

**Files:**
- Modify: `CLAUDE.md` (drop "Manus migration notes" section, update "Current focus")
- Modify: `todo.md` (add a "Manus removal — Apr 16 (Claude Code)" section listing the commits)

- [ ] **Step 1: Update `CLAUDE.md`**

Remove the "Manus migration notes" section (lines 41–44) and the "Current focus" lines about Manus runtime stripping (lines 46–47). Replace with a brief "Environment" section listing the current required env vars.

- [ ] **Step 2: Append a removal log entry to `todo.md`**

```markdown
## Manus Removal (2026-05-05 — Claude Code refactor)
- [x] Archive Manus working notes under docs/manus-archive/
- [x] Remove Manus debug collector and __manus__ public asset
- [x] Remove vite-plugin-manus-runtime and Manus allowedHosts
- [x] Replace manus.space URL fallbacks with localhost; standardize on APP_BASE_URL
- [x] Update test fixtures to loginMethod: "email"
- [x] Remove orphan Manus features (maps, image gen, voice, dataApi, ManusDialog, frontend Map)
- [x] Replace Forge LLM with @anthropic-ai/sdk (claude-sonnet-4-5)
- [x] Replace Forge storage with @aws-sdk/client-s3 to Cloudflare R2
- [x] Rewrite notifyOwner to send via SMTP (OWNER_EMAIL)
- [x] Remove Manus OAuth scaffolding; slim sdk.ts to JWT session helpers
- [x] Final env.ts cleanup: drop appId, oAuthServerUrl, ownerOpenId, forgeApiUrl, forgeApiKey
```

- [ ] **Step 3: Final full-repo grep for "manus"**

Run: case-insensitive grep for `manus`. Expected matches only in:
- `docs/manus-archive/**`
- `todo.md` (historical entries)
- `CLAUDE.md` (only if you decide to keep a "migrated from Manus" line in the Purpose section — optional)
- This plan file in `docs/superpowers/plans/`

No matches in `client/src/**`, `server/**`, `vite.config.ts`, `package.json`, or `.gitignore`.

- [ ] **Step 4: Final typecheck and tests**

Run: `pnpm check && pnpm test`
Expected: all pass; test count should match pre-refactor (~230).

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md todo.md
git commit -m "Update docs: remove Manus migration notes; log removal in todo.md"
```

---

## Required environment variables after the refactor

Document in your `.env` (or wherever you store secrets):

| Var | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection (Drizzle) |
| `JWT_SECRET` | Cookie/session signing secret |
| `APP_BASE_URL` | Public URL for email links (e.g. `https://opacommunity.com`) |
| `ANTHROPIC_API_KEY` | Anthropic API key for LLM calls |
| `R2_ACCOUNT_ID` | Cloudflare R2 account id |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret |
| `R2_BUCKET` | R2 bucket name |
| `R2_ENDPOINT` | R2 endpoint (alternative to `R2_ACCOUNT_ID`) |
| `OWNER_EMAIL` | Email address that receives owner-side notifications |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_FROM` | Resend (or any) SMTP creds |
| `PORT` | HTTP listen port (default 3000) |
| `NODE_ENV` | `development` / `production` |

Removed: `VITE_APP_ID`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `VITE_OAUTH_PORTAL_URL`, `VITE_APP_URL`, `VITE_FRONTEND_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`.

---

## Rollback plan

Each commit is a self-contained unit. To roll back any single piece:

```bash
git revert <commit-sha>
```

Most likely-to-need-rollback commits:
- **Commit 7 (LLM swap):** if Anthropic responses don't match the old Forge response shape and break a router caller, revert and address the specific caller before re-applying.
- **Commit 8 (R2 swap):** if uploads fail with R2 — most often a credentials / public-access setting issue. Verify R2 bucket policy and the `R2_ENDPOINT` form before reverting.
- **Commit 10 (OAuth removal):** if a forgotten reference to `sdk.exchangeCodeForToken` or `sdk.getUserInfo` surfaces in production. The grep in step 6 should catch this pre-merge.

Commits 1, 2, 3, 4, 5, 6, 9, 11, 12 are essentially mechanical and unlikely to need rollback.
