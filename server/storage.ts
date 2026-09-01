import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";
import { SIGNED_URL_EXPIRES_IN } from "./uploadPolicy";

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
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: SIGNED_URL_EXPIRES_IN }
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
    { expiresIn: SIGNED_URL_EXPIRES_IN }
  );
  return { key, url };
}
