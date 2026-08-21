const NEON_API_BASE = 'https://console.neon.tech/api/v2'

export type NeonBranch = {
  id: string
  name: string
}

export type NeonApi = {
  listBranches: (projectId: string) => Promise<NeonBranch[]>
  createBranch: (projectId: string, name: string) => Promise<NeonBranch>
  getConnectionUri: (options: {
    projectId: string
    branchId: string
    databaseName: string
    roleName: string
    pooled: boolean
  }) => Promise<string>
}

export type DatabaseEnv = {
  DATABASE_URL: string
  DATABASE_URL_UNPOOLED: string
}

export type ResolveDatabaseEnvInput = {
  context?: string
  reviewId?: string
  env: Record<string, string | undefined>
  neon?: NeonApi
}

export function previewBranchName(reviewId: string): string {
  return `preview-pr-${reviewId}`
}

export function parsePostgresIdentity(connectionString: string): {
  roleName: string
  databaseName: string
} {
  const url = new URL(connectionString)
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))
  const roleName = decodeURIComponent(url.username)

  if (!databaseName) {
    throw new Error('Connection string is missing a database name')
  }

  return { roleName, databaseName }
}

export function createNeonApi(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): NeonApi {
  const request = async (path: string, init?: RequestInit) => {
    const response = await fetchImpl(`${NEON_API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Neon API ${response.status}: ${body.slice(0, 200)}`)
    }

    return response.json() as Promise<unknown>
  }

  return {
    async listBranches(projectId) {
      const payload = await request(`/projects/${projectId}/branches`)
      const branches = readBranches(payload)
      return branches.map(readBranch)
    },
    async createBranch(projectId, name) {
      const payload = await request(`/projects/${projectId}/branches`, {
        method: 'POST',
        body: JSON.stringify({
          branch: { name },
          endpoints: [{ type: 'read_write' }],
        }),
      })
      if (!isRecord(payload) || !isRecord(payload.branch)) {
        throw new Error('Neon API returned an unexpected create-branch payload')
      }
      return readBranch(payload.branch)
    },
    async getConnectionUri({
      projectId,
      branchId,
      databaseName,
      roleName,
      pooled,
    }) {
      const params = new URLSearchParams({
        branch_id: branchId,
        database_name: databaseName,
        role_name: roleName,
        pooled: String(pooled),
      })
      const payload = await request(
        `/projects/${projectId}/connection_uri?${params.toString()}`,
      )
      if (!isRecord(payload) || typeof payload.uri !== 'string') {
        throw new Error(
          'Neon API returned an unexpected connection URI payload',
        )
      }
      return payload.uri
    },
  }
}

export async function resolveDatabaseEnv(
  input: ResolveDatabaseEnvInput,
): Promise<DatabaseEnv> {
  const context = input.context ?? input.env.CONTEXT
  const isPreview = context === 'deploy-preview'

  if (!isPreview) {
    return requireProductionEnv(input.env)
  }

  const reviewId = input.reviewId ?? input.env.REVIEW_ID
  const apiKey = input.env.NEON_API_KEY
  const projectId = input.env.NEON_PROJECT_ID
  const databaseUrl = requireEnv(input.env, 'DATABASE_URL')

  if (!apiKey) {
    throw new Error('NEON_API_KEY is required for deploy-preview')
  }
  if (!projectId) {
    throw new Error('NEON_PROJECT_ID is required for deploy-preview')
  }
  if (!reviewId) {
    throw new Error('REVIEW_ID is required for deploy-preview')
  }

  const neon = input.neon ?? createNeonApi(apiKey)
  const name = previewBranchName(reviewId)
  const identity = parsePostgresIdentity(databaseUrl)
  const branches = await neon.listBranches(projectId)
  let branch = branches.find((item) => item.name === name)

  if (!branch) {
    console.error(`Creating Neon branch ${name}`)
    branch = await neon.createBranch(projectId, name)
  } else {
    console.error(`Reusing Neon branch ${name}`)
  }

  const [pooled, unpooled] = await Promise.all([
    neon.getConnectionUri({
      projectId,
      branchId: branch.id,
      databaseName: identity.databaseName,
      roleName: identity.roleName,
      pooled: true,
    }),
    neon.getConnectionUri({
      projectId,
      branchId: branch.id,
      databaseName: identity.databaseName,
      roleName: identity.roleName,
      pooled: false,
    }),
  ])

  return {
    DATABASE_URL: pooled,
    DATABASE_URL_UNPOOLED: unpooled,
  }
}

function requireProductionEnv(
  env: Record<string, string | undefined>,
): DatabaseEnv {
  return {
    DATABASE_URL: requireEnv(env, 'DATABASE_URL'),
    DATABASE_URL_UNPOOLED: requireEnv(env, 'DATABASE_URL_UNPOOLED'),
  }
}

function requireEnv(
  env: Record<string, string | undefined>,
  name: string,
): string {
  const value = env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readBranches(payload: unknown): unknown[] {
  if (!isRecord(payload) || !Array.isArray(payload.branches)) {
    throw new Error('Neon API returned an unexpected branches payload')
  }
  return payload.branches
}

function readBranch(value: unknown): NeonBranch {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string'
  ) {
    throw new Error('Neon API returned an unexpected branch payload')
  }
  return { id: value.id, name: value.name }
}
