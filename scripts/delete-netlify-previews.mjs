const PER_PAGE = 100
const API_BASE = 'https://api.netlify.com/api/v1'

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    console.error(`${name} is required`)
    process.exit(1)
  }
  return value
}

async function request(path, { token, method = 'GET' }) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  const body = await response.text()
  return { status: response.status, body }
}

function parseDeploys(body) {
  let parsed
  try {
    parsed = JSON.parse(body)
  } catch {
    console.error('Netlify API returned non-JSON deploys payload')
    console.error(body)
    process.exit(1)
  }
  if (!Array.isArray(parsed)) {
    console.error('Netlify API returned an unexpected deploys payload')
    console.error(body)
    process.exit(1)
  }
  return parsed
}

async function listPreviewDeploys(siteId, token) {
  const deploys = []
  for (let page = 1; ; page += 1) {
    const query = new URLSearchParams({
      'deploy-previews': 'true',
      per_page: String(PER_PAGE),
      page: String(page),
    })
    const { status, body } = await request(
      `/sites/${encodeURIComponent(siteId)}/deploys?${query.toString()}`,
      { token },
    )
    if (status !== 200) {
      console.error(`Failed to list deploys (HTTP ${status})`)
      console.error(body)
      process.exit(1)
    }
    const pageDeploys = parseDeploys(body)
    deploys.push(...pageDeploys)
    if (pageDeploys.length < PER_PAGE) {
      return deploys
    }
  }
}

function isOk(status) {
  return status === 404 || (status >= 200 && status < 300)
}

function isGone(status) {
  return isOk(status)
}

async function deleteDeploy(deployId, token) {
  const first = await request(`/deploys/${encodeURIComponent(deployId)}`, {
    token,
    method: 'DELETE',
  })
  if (isGone(first.status)) {
    return
  }

  console.error(
    `Delete rejected for ${deployId} (HTTP ${first.status}); canceling and retrying`,
  )
  console.error(first.body)

  const cancel = await request(
    `/deploys/${encodeURIComponent(deployId)}/cancel`,
    {
      token,
      method: 'POST',
    },
  )
  if (!isOk(cancel.status)) {
    console.error(`Failed to cancel deploy ${deployId} (HTTP ${cancel.status})`)
    console.error(cancel.body)
    process.exit(1)
  }

  const retry = await request(`/deploys/${encodeURIComponent(deployId)}`, {
    token,
    method: 'DELETE',
  })
  if (isGone(retry.status)) {
    return
  }

  console.error(
    `Failed to delete deploy ${deployId} after cancel (HTTP ${retry.status})`,
  )
  console.error(retry.body)
  process.exit(1)
}

async function main() {
  const token = requireEnv('NETLIFY_AUTH_TOKEN')
  const siteId = requireEnv('NETLIFY_SITE_ID')
  const reviewId = requireEnv('REVIEW_ID')

  const deploys = await listPreviewDeploys(siteId, token)
  const matches = deploys.filter(
    (deploy) => String(deploy.review_id) === String(reviewId),
  )

  if (matches.length === 0) {
    console.log(`No Deploy Previews for review ${reviewId}; nothing to delete`)
    return
  }

  for (const deploy of matches) {
    console.log(`Deleting deploy ${deploy.id} (review_id=${deploy.review_id})`)
    await deleteDeploy(deploy.id, token)
  }

  console.log(
    `Deleted ${matches.length} Deploy Preview(s) for review ${reviewId}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
