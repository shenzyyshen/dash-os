import type { ToneSetting } from './mentor-tone'

export type ProjectStatus = 'selected' | 'low-interest' | 'cancelled'

export interface SelectedProject {
  vaultNotePath: string
  title: string
  status: ProjectStatus
  kind: 'code' | 'non-code'
  githubRepoPath: string | null
  toneOverride: ToneSetting | null
  lastKnownActivity: string | null
}
