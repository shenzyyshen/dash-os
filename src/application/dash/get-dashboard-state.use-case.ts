import type { AttemptResult } from '@/domain/shared/attempt-result'
import type { SelectedProject } from '@/domain/dash/models/selected-project'
import type { IVaultPort, VaultError } from '@/ports/outbound/i-vault-port'

export interface DashboardState {
  projects: SelectedProject[]
}

export class GetDashboardStateUseCase {
  constructor(private readonly vaultPort: IVaultPort) {}

  async execute(): Promise<AttemptResult<VaultError, DashboardState>> {
    const projectsResult = await this.vaultPort.listSelectedProjects()
    if (!projectsResult.success) return projectsResult

    return { success: true, error: null, value: { projects: projectsResult.value } }
  }
}
