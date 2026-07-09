import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig } from '@/infrastructure/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(__dirname, '..', 'fixtures', 'config')

describe('loadConfig', () => {
  it('loads and validates a well-formed config', async () => {
    const result = await loadConfig(path.join(FIXTURES, 'valid.config.json'))

    expect(result.success).toBe(true)
    expect(result.value?.vaultPath).toBe('/tmp/example-vault')
    expect(result.value?.defaultTone).toBe('calm-coach')
  })

  it('returns config_not_found for a missing file', async () => {
    const result = await loadConfig(path.join(FIXTURES, 'does-not-exist.json'))

    expect(result.success).toBe(false)
    expect(result.error?.type).toBe('config_not_found')
  })

  it('returns invalid_config when required fields are missing', async () => {
    const result = await loadConfig(path.join(FIXTURES, 'missing-field.config.json'))

    expect(result.success).toBe(false)
    expect(result.error?.type).toBe('invalid_config')
  })

  it('returns invalid_config for a bad tone enum value', async () => {
    const result = await loadConfig(path.join(FIXTURES, 'bad-enum.config.json'))

    expect(result.success).toBe(false)
    expect(result.error?.type).toBe('invalid_config')
  })

  it('returns invalid_config for malformed JSON', async () => {
    const result = await loadConfig(path.join(FIXTURES, 'malformed.config.json'))

    expect(result.success).toBe(false)
    expect(result.error?.type).toBe('invalid_config')
  })
})
