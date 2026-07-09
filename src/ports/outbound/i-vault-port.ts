import type { AttemptResult } from '@/domain/shared/attempt-result'
import type { SelectedProject } from '@/domain/dash/models/selected-project'

export interface IVaultPort {
  readFrontmatter(notePath: string): Promise<AttemptResult<VaultError, Record<string, unknown>>>
  listSelectedProjects(): Promise<AttemptResult<VaultError, SelectedProject[]>>
}

export type VaultError =
  | { type: 'note_not_found'; path: string }
  | { type: 'malformed_frontmatter'; path: string; reason: string }
