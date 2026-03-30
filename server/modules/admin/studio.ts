import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const repoRoot = resolve(import.meta.dir, '../../..')
const serverRoot = resolve(import.meta.dir, '../..')
const studioHome = resolve(repoRoot, 'data/.drizzle-studio')
const STUDIO_HOST = '127.0.0.1'
const STUDIO_PORT = 4983

export interface StudioStatus {
  running: boolean
  status: 'idle' | 'starting' | 'running' | 'failed'
  host: string
  port: number
  url: string
  pid: number | null
  startedAt: number | null
  error: string | null
  lastOutput: string[]
}

const statusState: StudioStatus = {
  running: false,
  status: 'idle',
  host: STUDIO_HOST,
  port: STUDIO_PORT,
  url: `https://${STUDIO_HOST}:${STUDIO_PORT}`,
  pid: null,
  startedAt: null,
  error: null,
  lastOutput: [],
}

let studioReady = false
const MAX_OUTPUT_LINES = 50

function ensureStudioHome() {
  if (!existsSync(studioHome))
    mkdirSync(studioHome, { recursive: true })
}

function appendOutput(line: string) {
  const content = line.trim()
  if (!content)
    return

  statusState.lastOutput.push(content)
  if (statusState.lastOutput.length > MAX_OUTPUT_LINES)
    statusState.lastOutput.shift()
}

function getStudioEnv() {
  const homeDrive = process.env.HOMEDRIVE || 'C:'
  const homePath = process.env.HOMEPATH || '\\Users\\Public'
  const userProfile = process.env.USERPROFILE || `${homeDrive}${homePath}`

  return {
    ...process.env,
    HOME: process.env.HOME || userProfile,
    USERPROFILE: userProfile,
    HOMEDRIVE: homeDrive,
    HOMEPATH: homePath,
    APPDATA: process.env.APPDATA || resolve(studioHome, 'Roaming'),
    LOCALAPPDATA: process.env.LOCALAPPDATA || resolve(studioHome, 'Local'),
  }
}

function startProcess() {
  ensureStudioHome()
  const child = spawn('bunx', ['drizzle-kit', 'studio', '--host', STUDIO_HOST, '--port', String(STUDIO_PORT)], {
    cwd: serverRoot,
    env: getStudioEnv(),
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })

  studioReady = false
  statusState.running = true
  statusState.status = 'starting'
  statusState.pid = child.pid ?? null
  statusState.startedAt = Date.now()
  statusState.error = null
  statusState.lastOutput = []

  const handleOutput = (chunk: string | Uint8Array, level: 'info' | 'warn') => {
    const text = chunk.toString()
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim())
        continue
      appendOutput(line)
      if (line.includes('Drizzle Studio is up and running')) {
        statusState.status = 'running'
        studioReady = true
      }
      if (level === 'warn')
        console.warn(`[admin:studio] ${line}`)
      else
        console.info(`[admin:studio] ${line}`)
    }
  }

  child.stdout?.on('data', chunk => handleOutput(chunk, 'info'))
  child.stderr?.on('data', chunk => handleOutput(chunk, 'warn'))

  child.on('error', (error) => {
    statusState.running = false
    statusState.status = 'failed'
    statusState.error = error.message
    studioReady = false
    appendOutput(`[spawn error] ${error.message}`)
    console.error('[admin] drizzle studio process error', error)
  })

  child.on('exit', (code, signal) => {
    const expectedExit = !statusState.running
    statusState.running = false
    studioReady = false
    if (expectedExit)
      statusState.status = 'idle'
    else
      statusState.status = code === 0 ? 'idle' : 'failed'

    statusState.pid = null
    if (!expectedExit && code !== 0)
      statusState.error = `drizzle studio exited with code ${code ?? 'unknown'}${signal ? ` (${signal})` : ''}`
  })

  child.unref()
}

async function waitForStudioReady(timeoutMs = 15000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (!statusState.running)
      break
    if (studioReady)
      return true
    await Bun.sleep(200)
  }
  return studioReady
}

export function getStudioStatus(): StudioStatus {
  return {
    ...statusState,
    lastOutput: [...statusState.lastOutput],
  }
}

export async function ensureStudioRunning() {
  if (!statusState.running)
    startProcess()

  const ready = await waitForStudioReady()
  if (!ready)
    return { ok: false as const, status: getStudioStatus() }

  return { ok: true as const, status: getStudioStatus() }
}

export async function proxyStudio(request: Request, path: string) {
  const ready = await ensureStudioRunning()
  if (!ready.ok) {
    return new Response(JSON.stringify({ message: 'error.drizzleStudioUnavailable', studio: ready.status }), {
      status: 503,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  }

  const url = new URL(request.url)
  const target = new URL(`${statusState.url}${path.startsWith('/') ? path : `/${path}`}`)
  target.search = url.search

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('authorization')

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  }

  if (!['GET', 'HEAD'].includes(request.method))
    init.body = await request.arrayBuffer()

  try {
    const response = await fetch(target, init)
    const proxyHeaders = new Headers(response.headers)
    proxyHeaders.delete('content-encoding')
    proxyHeaders.delete('content-length')
    proxyHeaders.delete('transfer-encoding')
    proxyHeaders.delete('connection')
    return new Response(response.body, {
      status: response.status,
      headers: proxyHeaders,
    })
  }
  catch {
    return new Response(JSON.stringify({ message: 'error.drizzleStudioUnavailable', studio: getStudioStatus() }), {
      status: 503,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  }
}
