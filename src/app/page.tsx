import { loadConfig } from '@/infrastructure/config'
import { buildContainer } from '@/infrastructure/container'
import { ProjectGrid } from './components/ProjectGrid'
import styles from './page.module.css'

export default async function DashboardPage() {
  const configResult = await loadConfig()
  if (!configResult.success) {
    return (
      <main className={styles.main}>
        <p className={styles.error}>
          Config error ({configResult.error.type}): {configResult.error.path}
        </p>
      </main>
    )
  }

  const container = buildContainer(configResult.value)
  const stateResult = await container.getDashboardState.execute()
  if (!stateResult.success) {
    return (
      <main className={styles.main}>
        <p className={styles.error}>Vault error ({stateResult.error.type})</p>
      </main>
    )
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>DASH</h1>
        <span className={styles.subtitle}>{stateResult.value.projects.length} tracked</span>
      </div>
      <ProjectGrid projects={stateResult.value.projects} />
    </main>
  )
}
