import type { User } from "../drizzle/schema";

/** Credential fields that must never appear in API responses. */
export const SECRET_USER_FIELDS = [
  "passwordHash",
  "resetToken",
  "resetTokenExpiresAt",
] as const;

export type PublicUser = Omit<User, (typeof SECRET_USER_FIELDS)[number]>;

export function toPublicUser(user: User): PublicUser;
export function toPublicUser(user: User | null | undefined): PublicUser | null;
export function toPublicUser(user: User | null | undefined): PublicUser | null {
  if (!user) return null;
  const {
    passwordHash: _passwordHash,
    resetToken: _resetToken,
    resetTokenExpiresAt: _resetTokenExpiresAt,
    ...safe
  } = user;
  return safe;
}

export function assertNoSecretUserFields(value: unknown): void {
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  for (const field of SECRET_USER_FIELDS) {
    if (field in record) {
      throw new Error(`Refusing to return user object containing ${field}`);
    }
  }
}
