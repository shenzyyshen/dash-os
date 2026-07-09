import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FilesystemVaultAdapter } from '@/adapters/vault/filesystem-vault-adapter'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_VAULT = path.join(__dirname, '..', '..', 'fixtures', 'vault')

describe('FilesystemVaultAdapter', () => {
  describe('readFrontmatter', () => {
    it('returns parsed frontmatter for a valid note', async () => {
      const adapter = new FilesystemVaultAdapter(FIXTURE_VAULT)

      const result = await adapter.readFrontmatter('Project A.md')

      expect(result.success).toBe(true)
      expect(result.value).toMatchObject({ 'dashboard-status': 'selected', title: 'Project A' })
    })

    it('returns note_not_found for a missing note', async () => {
      const adapter = new FilesystemVaultAdapter(FIXTURE_VAULT)

      const result = await adapter.readFrontmatter('Does Not Exist.md')

      expect(result.success).toBe(false)
      expect(result.error).toEqual({ type: 'note_not_found', path: 'Does Not Exist.md' })
    })

    it('returns malformed_frontmatter for broken YAML', async () => {
      const adapter = new FilesystemVaultAdapter(FIXTURE_VAULT)

      const result = await adapter.readFrontmatter('Malformed.md')

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('malformed_frontmatter')
    })
  })

  describe('listSelectedProjects', () => {
    it('returns every note carrying a dashboard-status field, including nested folders', async () => {
      const adapter = new FilesystemVaultAdapter(FIXTURE_VAULT)

      const result = await adapter.listSelectedProjects()

      expect(result.success).toBe(true)
      const titles = result.value?.map((p) => p.title).sort()
      expect(titles).toEqual(['Nested Project', 'Project A', 'Project B', 'Project C'])
    })

    it('excludes notes with no dashboard-status field', async () => {
      const adapter = new FilesystemVaultAdapter(FIXTURE_VAULT)

      const result = await adapter.listSelectedProjects()

      const titles = result.value?.map((p) => p.title)
      expect(titles).not.toContain('Not Tracked')
    })

    it('skips notes with malformed frontmatter instead of failing the whole listing', async () => {
      const adapter = new FilesystemVaultAdapter(FIXTURE_VAULT)

      const result = await adapter.listSelectedProjects()

      expect(result.success).toBe(true)
      const titles = result.value?.map((p) => p.title)
      expect(titles).not.toContain('Unterminated')
    })

    it('maps status, kind, and githubRepoPath correctly', async () => {
      const adapter = new FilesystemVaultAdapter(FIXTURE_VAULT)

      const result = await adapter.listSelectedProjects()

      const projectC = result.value?.find((p) => p.title === 'Project C')
      expect(projectC).toMatchObject({
        status: 'cancelled',
        kind: 'code',
        githubRepoPath: '/Users/example/code/project-c',
      })

      const projectA = result.value?.find((p) => p.title === 'Project A')
      expect(projectA).toMatchObject({
        status: 'selected',
        kind: 'non-code',
        githubRepoPath: null,
      })
    })
  })
})
