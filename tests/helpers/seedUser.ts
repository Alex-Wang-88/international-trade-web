import { getPayload } from 'payload'
import config from '../../src/payload.config.js'
import { randomBytes, randomUUID } from 'node:crypto'

export const testUser = {
  email: `e2e-owner-${randomUUID()}@example.test`,
  password: `E2E-${randomBytes(24).toString('base64url')}`,
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  await payload.create({
    collection: 'users',
    data: { ...testUser, name: 'E2E Owner', role: 'owner' },
    overrideAccess: true,
  })
}
