import { describe, it, expect, vi } from 'vitest'
import { GetDashboardStateUseCase } from '@/application/dash/get-dashboard-state.use-case'
import type { IVaultPort } from '@/ports/outbound/i-vault-port'
import { ok, fail } from '@/domain/shared/attempt-result'
import type { SelectedProject } from '@/domain/dash/models/selected-project'

function makeProject(overrides: Partial<SelectedProject> = {}): SelectedProject {
  return {
    vaultNotePath: 'Project A.md',
    title: 'Project A',
    status: 'selected',
    kind: 'non-code',
    githubRepoPath: null,
    toneOverride: null,
    lastKnownActivity: null,
    ...overrides,
  }
}

describe('GetDashboardStateUseCase', () => {
  it('returns the vault-derived project list on the happy path', async () => {
    const vaultPort: IVaultPort = {
      readFrontmatter: vi.fn(),
      listSelectedProjects: vi.fn().mockResolvedValue(ok([makeProject()])),
    }
    const useCase = new GetDashboardStateUseCase(vaultPort)

    const result = await useCase.execute()

    expect(result.success).toBe(true)
    expect(result.value?.projects).toEqual([makeProject()])
  })

  it('propagates a vault port failure without swallowing it', async () => {
    const vaultPort: IVaultPort = {
      readFrontmatter: vi.fn(),
      listSelectedProjects: vi.fn().mockResolvedValue(fail({ type: 'note_not_found', path: 'x.md' })),
    }
    const useCase = new GetDashboardStateUseCase(vaultPort)

    const result = await useCase.execute()

    expect(result.success).toBe(false)
    expect(result.error).toEqual({ type: 'note_not_found', path: 'x.md' })
  })
})
