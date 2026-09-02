/**
 * lib/crypto.ts — server-only field-level encryption (AES-256-GCM).
 *
 * Used to encrypt sensitive financial fields (currently
 * app_users.paystack_recipient_code) at rest, on top of Supabase's
 * platform-level encryption. Uses Node's `crypto` module, so this must
 * only be imported from server code (API routes / route handlers) —
 * never from a 'use client' component or lib/db.ts, which also runs
 * in the browser bundle.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGO = 'aes-256-gcm'
const KEY_SALT = 'workershub-field-encryption-v1'

function getKey(): Buffer {
  const secret = process.env.FIELD_ENCRYPTION_KEY
  if (!secret) throw new Error('FIELD_ENCRYPTION_KEY is not set')
  return scryptSync(secret, KEY_SALT, 32)
}

/** Encrypts a plaintext string. Returns `iv.authTag.ciphertext`, each base64. */
export function encryptField(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv, authTag, encrypted].map((b) => b.toString('base64')).join('.')
}

/** Decrypts a value produced by encryptField(). Throws if the payload is malformed or the key is wrong. */
export function decryptField(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed encrypted field payload')
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  const decipher = createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

/**
 * Reads an encrypted app_users.paystack_recipient_code value. Falls back
 * to treating it as legacy plaintext if decryption fails, so codes saved
 * before encryption was introduced keep working. Used by every route
 * that needs to hand a recipient code to Paystack.
 */
export function getDecryptedRecipientCode(stored: string | null | undefined): string | null {
  if (!stored) return null
  try { return decryptField(stored) } catch { return stored }
}
