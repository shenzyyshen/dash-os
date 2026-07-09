import type { SelectedProject, ProjectStatus } from '@/domain/dash/models/selected-project'
import styles from './ProjectGrid.module.css'

const STATUS_META: Record<ProjectStatus, { color: string; icon: string; label: string }> = {
  selected: { color: 'var(--status-good)', icon: '●', label: 'selected' },
  'low-interest': { color: 'var(--status-warning)', icon: '◐', label: 'low-interest' },
  cancelled: { color: 'var(--text-muted)', icon: '✕', label: 'cancelled' },
}

export function ProjectGrid({ projects }: { projects: SelectedProject[] }) {
  if (projects.length === 0) {
    return <p className={styles.empty}>No projects tracked yet — add `dashboard-status: selected` to a vault note.</p>
  }

  return (
    <div className={styles.grid}>
      {projects.map((project) => {
        const meta = STATUS_META[project.status]
        return (
          <article key={project.vaultNotePath} className={styles.tile}>
            <h2 className={styles.title}>{project.title}</h2>
            <span className={styles.badge}>
              <span className={styles.badgeDot} style={{ color: meta.color }} aria-hidden>
                {meta.icon}
              </span>
              {meta.label}
            </span>
            <div className={styles.meta}>
              <span>{project.kind}</span>
              <span>last touched: pending (Slice 4)</span>
            </div>
          </article>
        )
      })}
    </div>
  )
}
