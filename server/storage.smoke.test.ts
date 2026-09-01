import "dotenv/config";
import { describe, it, expect } from "vitest";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { storagePut, storageGet } from "./storage";
import { ENV } from "./_core/env";

const HAS_R2 = Boolean(
  ENV.r2AccessKeyId &&
    ENV.r2SecretAccessKey &&
    ENV.r2Bucket &&
    (ENV.r2Endpoint || ENV.r2AccountId)
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
      (ENV.r2AccountId
        ? `https://${ENV.r2AccountId}.r2.cloudflarestorage.com`
        : "");
    const cleanup = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: ENV.r2AccessKeyId,
        secretAccessKey: ENV.r2SecretAccessKey,
      },
    });
    await cleanup.send(
      new DeleteObjectCommand({ Bucket: ENV.r2Bucket, Key: key })
    );
  }, 30_000);
});
