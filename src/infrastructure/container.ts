import { FilesystemVaultAdapter } from '@/adapters/vault/filesystem-vault-adapter'
import { GetDashboardStateUseCase } from '@/application/dash/get-dashboard-state.use-case'
import type { DashConfig } from './config'

export interface Container {
  getDashboardState: GetDashboardStateUseCase
}

export function buildContainer(config: DashConfig): Container {
  const vaultPort = new FilesystemVaultAdapter(config.vaultPath)
  const getDashboardState = new GetDashboardStateUseCase(vaultPort)

  return { getDashboardState }
}
