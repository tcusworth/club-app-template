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

  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
  cloudflareStreamApiToken: process.env.CLOUDFLARE_STREAM_API_TOKEN ?? "",

  ownerEmail: process.env.OWNER_EMAIL ?? "",
};
