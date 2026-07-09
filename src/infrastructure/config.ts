import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { type AttemptResult, ok, fail } from '@/domain/shared/attempt-result'

const dayTemplateSchema = z.object({ workoutMinutesDefault: z.number() })

const dashConfigSchema = z.object({
  vaultPath: z.string().min(1),
  watchListNotePath: z.string().min(1),
  defaultTone: z.enum(['drill-sergeant', 'calm-coach', 'adaptive']),
  dayTemplates: z.object({
    'deep-work': dayTemplateSchema,
    vacation: dayTemplateSchema,
    travel: dayTemplateSchema,
  }),
  researchJob: z.object({ scheduleCron: z.string().min(1) }),
})

export type DashConfig = z.infer<typeof dashConfigSchema>

export type ConfigError =
  | { type: 'config_not_found'; path: string }
  | { type: 'invalid_config'; path: string; reason: string }

export async function loadConfig(configPath?: string): Promise<AttemptResult<ConfigError, DashConfig>> {
  const resolvedPath = configPath ?? process.env.DASH_CONFIG_PATH ?? join(process.cwd(), 'dash.config.json')

  let raw: string
  try {
    raw = await readFile(resolvedPath, 'utf-8')
  } catch {
    return fail({ type: 'config_not_found', path: resolvedPath })
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch (err) {
    return fail({
      type: 'invalid_config',
      path: resolvedPath,
      reason: `malformed JSON: ${err instanceof Error ? err.message : String(err)}`,
    })
  }

  const parsed = dashConfigSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return fail({ type: 'invalid_config', path: resolvedPath, reason: parsed.error.message })
  }

  return ok(parsed.data)
}
