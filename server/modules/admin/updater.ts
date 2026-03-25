import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const repoRoot = resolve(import.meta.dir, '../../..')
const MAX_UPDATE_OUTPUT_LINES = 50

export interface UpdateStatus {
  running: boolean
  status: 'idle' | 'running' | 'success' | 'failed'
  scriptPath: string | null
  cwd: string
  pid: number | null
  startedAt: number | null
  finishedAt: number | null
  exitCode: number | null
  signal: string | null
  lastOutput: string[]
  error: string | null
}

const updateStatus: UpdateStatus = {
  running: false,
  status: 'idle',
  scriptPath: null,
  cwd: repoRoot,
  pid: null,
  startedAt: null,
  finishedAt: null,
  exitCode: null,
  signal: null,
  lastOutput: [],
  error: null,
}

function getUpdateScriptPath() {
  const overridePath = process.env.PBHH_UPDATE_SCRIPT_PATH
  if (overridePath)
    return overridePath

  const rootScript = resolve(repoRoot, 'update.sh')
  if (existsSync(rootScript))
    return rootScript

  return rootScript
}

function appendOutput(line: string) {
  const content = line.trim()
  if (!content)
    return

  updateStatus.lastOutput.push(content)
  if (updateStatus.lastOutput.length > MAX_UPDATE_OUTPUT_LINES)
    updateStatus.lastOutput.shift()
}

function pipeOutput(stream: NodeJS.ReadableStream | null, level: 'info' | 'warn') {
  if (!stream)
    return

  let pending = ''
  stream.on('data', (chunk) => {
    pending += chunk.toString()
    const lines = pending.split(/\r?\n/)
    pending = lines.pop() ?? ''

    for (const line of lines) {
      appendOutput(line)
      if (level === 'warn')
        console.warn(`[admin:update] ${line}`)
      else
        console.info(`[admin:update] ${line}`)
    }
  })

  stream.on('end', () => {
    if (!pending.trim())
      return

    appendOutput(pending)
    if (level === 'warn')
      console.warn(`[admin:update] ${pending}`)
    else
      console.info(`[admin:update] ${pending}`)
    pending = ''
  })
}

export function getUpdateStatus(): UpdateStatus {
  return {
    ...updateStatus,
    lastOutput: [...updateStatus.lastOutput],
  }
}

export function runUpdateScript() {
  const scriptPath = getUpdateScriptPath()
  if (!existsSync(scriptPath))
    return { ok: false as const, reason: 'missing' as const, scriptPath }

  if (updateStatus.running)
    return { ok: false as const, reason: 'running' as const, scriptPath }

  const child = spawn('bash', ['--login', scriptPath], {
    cwd: repoRoot,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  updateStatus.running = true
  updateStatus.status = 'running'
  updateStatus.scriptPath = scriptPath
  updateStatus.cwd = repoRoot
  updateStatus.pid = child.pid ?? null
  updateStatus.startedAt = Date.now()
  updateStatus.finishedAt = null
  updateStatus.exitCode = null
  updateStatus.signal = null
  updateStatus.error = null
  updateStatus.lastOutput = []

  pipeOutput(child.stdout, 'info')
  pipeOutput(child.stderr, 'warn')

  child.on('error', (error) => {
    updateStatus.running = false
    updateStatus.status = 'failed'
    updateStatus.finishedAt = Date.now()
    updateStatus.exitCode = null
    updateStatus.signal = null
    updateStatus.error = error.message
    appendOutput(`[spawn error] ${error.message}`)
    console.error('[admin] update process error', error)
  })

  child.on('exit', (code, signal) => {
    updateStatus.running = false
    updateStatus.finishedAt = Date.now()
    updateStatus.exitCode = code
    updateStatus.signal = signal
    updateStatus.status = code === 0 ? 'success' : 'failed'
    updateStatus.error = code === 0 ? null : `update exited with code ${code ?? 'unknown'}`

    if (code === 0)
      console.info('[admin] update finished', { scriptPath, pid: child.pid, code, signal })
    else
      console.error('[admin] update finished', { scriptPath, pid: child.pid, code, signal })
  })

  child.unref()
  console.info('[admin] update requested', { scriptPath, cwd: repoRoot, pid: child.pid })
  return { ok: true as const, scriptPath, pid: child.pid, update: getUpdateStatus() }
}
