import { createCipheriv, createDecipheriv, randomBytes, createHash, timingSafeEqual } from "node:crypto"

/**
 * AES-256-GCM token encryption for OAuth tokens at rest.
 *
 * Storage format (single string column):
 *   v1:<base64 iv>:<base64 ciphertext>:<base64 authTag>
 *
 * Key is read from TOKEN_ENCRYPTION_KEY env var (base64-encoded 32 bytes).
 */

const ALG = "aes-256-gcm"
const PREFIX = "v1:"

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY
  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEY env var is not set")
  }
  // Accept base64 first; fall back to utf8 if exactly 32 bytes
  const buf = (() => {
    try {
      const b = Buffer.from(raw, "base64")
      if (b.length === 32) return b
    } catch {}
    const utf = Buffer.from(raw, "utf8")
    if (utf.length === 32) return utf
    // last resort: hash to derive 32 bytes
    return createHash("sha256").update(raw).digest()
  })()
  if (buf.length !== 32) {
    return createHash("sha256").update(raw).digest()
  }
  return buf
}

export function encryptToken(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return null
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALG, key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString("base64")}:${enc.toString("base64")}:${tag.toString("base64")}`
}

export function decryptToken(value: string | null | undefined): string | null {
  if (!value) return null
  // Backward compat: if the value isn't in our v1 format, treat it as plaintext
  // (legacy rows stored before encryption was rolled out).
  if (!value.startsWith(PREFIX)) return value
  try {
    const [, ivB64, ctB64, tagB64] = value.split(":")
    if (!ivB64 || !ctB64 || !tagB64) return null
    const key = getKey()
    const iv = Buffer.from(ivB64, "base64")
    const ct = Buffer.from(ctB64, "base64")
    const tag = Buffer.from(tagB64, "base64")
    const decipher = createDecipheriv(ALG, key, iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(ct), decipher.final()])
    return dec.toString("utf8")
  } catch (err) {
    console.error("[v0] decryptToken failed:", err)
    return null
  }
}

/**
 * Per-agent shared secret support.
 * - generateAgentSecret() produces a 32-byte url-safe random token shown to the user once.
 * - hashAgentSecret() stores a sha-256 hash in the DB.
 * - verifyAgentSecret() compares with constant-time equality.
 */
export function generateAgentSecret(): string {
  return randomBytes(32).toString("base64url")
}

export function hashAgentSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex")
}

export function verifyAgentSecret(secret: string, hash: string): boolean {
  if (!secret || !hash) return false
  const a = Buffer.from(hashAgentSecret(secret), "hex")
  const b = Buffer.from(hash, "hex")
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
