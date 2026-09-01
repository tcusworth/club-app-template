import { ENV } from "./_core/env";

const STREAM_BASE = "https://api.cloudflare.com/client/v4";

function getCreds(): { accountId: string; token: string } {
  const { cloudflareAccountId, cloudflareStreamApiToken } = ENV;
  if (!cloudflareAccountId || !cloudflareStreamApiToken) {
    throw new Error(
      "Cloudflare Stream credentials missing: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN"
    );
  }
  return { accountId: cloudflareAccountId, token: cloudflareStreamApiToken };
}

async function streamFetch(path: string, init: RequestInit = {}): Promise<any> {
  const { accountId, token } = getCreds();
  const url = `${STREAM_BASE}/accounts/${accountId}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cloudflare Stream ${init.method ?? "GET"} ${path} failed: ${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function createDirectUploadUrl(maxDurationSeconds: number): Promise<{ uploadURL: string; uid: string }> {
  const json = await streamFetch("/stream/direct_upload", {
    method: "POST",
    body: JSON.stringify({ maxDurationSeconds }),
  });
  const result = json?.result;
  if (!result?.uploadURL || !result?.uid) {
    throw new Error("Cloudflare Stream direct_upload returned an unexpected payload");
  }
  return { uploadURL: result.uploadURL, uid: result.uid };
}

export async function getVideoStatus(uid: string): Promise<{ readyToStream: boolean; duration: number; thumbnail: string }> {
  const json = await streamFetch(`/stream/${uid}`);
  const r = json?.result;
  return {
    readyToStream: Boolean(r?.readyToStream),
    duration: typeof r?.duration === "number" ? r.duration : 0,
    thumbnail: typeof r?.thumbnail === "string" ? r.thumbnail : "",
  };
}

export async function deleteVideo(uid: string): Promise<void> {
  await streamFetch(`/stream/${uid}`, { method: "DELETE" });
}
