import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import matter from 'gray-matter'
import { type AttemptResult, ok, fail } from '@/domain/shared/attempt-result'
import type { SelectedProject, ProjectStatus } from '@/domain/dash/models/selected-project'
import type { IVaultPort, VaultError } from '@/ports/outbound/i-vault-port'

export class FilesystemVaultAdapter implements IVaultPort {
  constructor(private readonly vaultPath: string) {}

  async readFrontmatter(notePath: string): Promise<AttemptResult<VaultError, Record<string, unknown>>> {
    const absolutePath = join(this.vaultPath, notePath)

    let raw: string
    try {
      raw = await readFile(absolutePath, 'utf-8')
    } catch {
      return fail({ type: 'note_not_found', path: notePath })
    }

    try {
      const parsed = matter(raw)
      return ok(parsed.data)
    } catch (err) {
      return fail({
        type: 'malformed_frontmatter',
        path: notePath,
        reason: err instanceof Error ? err.message : String(err),
      })
    }
  }

  async listSelectedProjects(): Promise<AttemptResult<VaultError, SelectedProject[]>> {
    const notePaths = await this.findMarkdownFiles(this.vaultPath)
    const projects: SelectedProject[] = []

    for (const absolutePath of notePaths) {
      const notePath = relative(this.vaultPath, absolutePath)
      const result = await this.readFrontmatter(notePath)
      if (!result.success) continue

      const status = result.value['dashboard-status']
      if (!isProjectStatus(status)) continue

      const title = typeof result.value.title === 'string' ? result.value.title : notePath
      const githubRepoPath = typeof result.value['github-repo'] === 'string' ? result.value['github-repo'] : null

      projects.push({
        vaultNotePath: notePath,
        title,
        status,
        kind: githubRepoPath ? 'code' : 'non-code',
        githubRepoPath,
        toneOverride: null,
        lastKnownActivity: null,
      })
    }

    return ok(projects)
  }

  private async findMarkdownFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true })
    const files: string[] = []

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...(await this.findMarkdownFiles(fullPath)))
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath)
      }
    }

    return files
  }
}

function isProjectStatus(value: unknown): value is ProjectStatus {
  return value === 'selected' || value === 'low-interest' || value === 'cancelled'
}
