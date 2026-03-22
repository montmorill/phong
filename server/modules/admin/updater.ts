import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const repoRoot = resolve(import.meta.dir, '../../..')

function getUpdateScriptPath() {
  const overridePath = process.env.PBHH_UPDATE_SCRIPT_PATH
  if (overridePath)
    return overridePath

  const rootScript = resolve(repoRoot, 'update.sh')
  if (existsSync(rootScript))
    return rootScript

  return rootScript
}

export function runUpdateScript() {
  const scriptPath = getUpdateScriptPath()
  if (!existsSync(scriptPath))
    return { ok: false as const, scriptPath }

  const child = spawn('bash', [scriptPath], {
    cwd: repoRoot,
    detached: true,
    stdio: 'ignore',
  })

  child.unref()
  console.info('[admin] update requested', { scriptPath, cwd: repoRoot })
  return { ok: true as const, scriptPath }
}
