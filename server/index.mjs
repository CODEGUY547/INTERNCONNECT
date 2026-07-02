import http from 'node:http'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'

const port = Number(process.env.PORT ?? 4500)
const appOrigin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5173'
const dataFile = new URL('./data-store.json', import.meta.url)
const uploadDirectory = new URL('./uploads/', import.meta.url)
const uploadDirectoryPath = fileURLToPath(uploadDirectory)
const defaultGeocodeCountry = process.env.GEOCODE_COUNTRY ?? 'Uganda'
const defaultAuthSecret = 'internconnect-local-dev-secret-change-before-deployment'
const defaultBootstrapAdminPassword = 'internconnect'
const authSecret = process.env.AUTH_SECRET ?? defaultAuthSecret
const bootstrapAdminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? defaultBootstrapAdminPassword
const tokenTtlSeconds = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 60 * 60)
const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 5 * 1024 * 1024)
const localTestingMode = process.env.LOCAL_TESTING_MODE === 'true'

if (
  process.env.NODE_ENV === 'production' &&
  (authSecret === defaultAuthSecret || bootstrapAdminPassword === defaultBootstrapAdminPassword)
) {
  throw new Error('Production requires AUTH_SECRET and BOOTSTRAP_ADMIN_PASSWORD environment variables.')
}

const loginLabelsByRole = {
  admin: 'Admin staff ID',
  companySupervisor: 'Company staff ID',
  intern: 'Student number',
  universitySupervisor: 'University staff ID',
}

const roleMetrics = {
  admin: ['0 interns', '0 active placements', '0 pending reports'],
  intern: ['0% attendance', '0 hours logged', '0 open tasks'],
  companySupervisor: ['0 assigned interns', '0 approvals', '0% tasks completed'],
  universitySupervisor: ['0 students', '0 visits', '0 at-risk students'],
}

const bootstrapAccounts = [
  {
    email: 'admin@internnexus.local',
    loginId: 'ADM-001',
    loginLabel: 'Admin staff ID',
    name: 'System Administrator',
    organization: 'Intern Nexus HQ',
    passwordHash: bcrypt.hashSync(bootstrapAdminPassword, 12),
    role: 'admin',
  },
]

const seedData = {
  accountRequests: [],
  announcements: [],
  attendanceEvents: [],
  approvedAccounts: [],
  auditLogs: [],
  placements: [],
  complaints: [],
  documents: [],
  evaluations: [],
  messages: [],
  reports: [],
  tasks: [],
}

const fallbackCompanySite = {
  name: 'Workplace not configured',
  address: 'Kampala, Uganda',
  latitude: 0.3476,
  longitude: 32.5825,
  radiusMeters: Number(process.env.MAX_GPS_RADIUS_METERS ?? 150),
}
const strictGeofence = process.env.STRICT_GEOFENCE !== 'false'

const companySites = [
  fallbackCompanySite,
  {
    name: 'Nile Bank',
    address: 'Nakasero, Kampala, Uganda',
    latitude: 0.318,
    longitude: 32.5822,
    radiusMeters: 180,
  },
  {
    name: 'NITA Uganda',
    aliases: [
      'NITA',
      'NITA-U',
      'National Information Technology Authority Uganda',
      'National Information Technology Authority - Uganda',
    ],
    address: 'National Information Technology Authority, Lugogo By-Pass - Rotary Avenue, Nakawa, Kampala, Uganda',
    latitude: 0.3332214,
    longitude: 32.6016537,
    radiusMeters: 300,
  },
  {
    name: 'Kampala HealthTech',
    address: 'Kololo, Kampala, Uganda',
    latitude: 0.3351,
    longitude: 32.596,
    radiusMeters: 180,
  },
  {
    name: 'CivicSoft',
    address: 'Ntinda, Kampala, Uganda',
    latitude: 0.3546,
    longitude: 32.6157,
    radiusMeters: 200,
  },
]

const json = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': appOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(payload, null, 2))
}

const mergeData = (value) => ({
  accountRequests: Array.isArray(value?.accountRequests) ? value.accountRequests : seedData.accountRequests,
  announcements: Array.isArray(value?.announcements) ? value.announcements : seedData.announcements,
  attendanceEvents: Array.isArray(value?.attendanceEvents) ? value.attendanceEvents : seedData.attendanceEvents,
  approvedAccounts: Array.isArray(value?.approvedAccounts) ? value.approvedAccounts : seedData.approvedAccounts,
  auditLogs: Array.isArray(value?.auditLogs) ? value.auditLogs : seedData.auditLogs,
  complaints: Array.isArray(value?.complaints) ? value.complaints : seedData.complaints,
  documents: Array.isArray(value?.documents) ? value.documents : seedData.documents,
  evaluations: Array.isArray(value?.evaluations) ? value.evaluations : seedData.evaluations,
  messages: Array.isArray(value?.messages) ? value.messages : seedData.messages,
  placements: Array.isArray(value?.placements) ? value.placements : seedData.placements,
  reports: Array.isArray(value?.reports) ? value.reports : seedData.reports,
  tasks: Array.isArray(value?.tasks) ? value.tasks : seedData.tasks,
})

const loadData = async () => {
  try {
    const raw = await readFile(dataFile, 'utf8')
    return mergeData(JSON.parse(raw))
  } catch {
    const initialData = mergeData(seedData)
    await writeFile(dataFile, JSON.stringify(initialData, null, 2))
    return initialData
  }
}

const saveData = async () => {
  await writeFile(dataFile, JSON.stringify(store, null, 2))
}

let store = await loadData()

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > maxUploadBytes * 1.5) {
        reject(new Error('Payload too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
  })

const toRadians = (value) => (value * Math.PI) / 180

const distanceMeters = (start, end) => {
  const earthRadiusMeters = 6_371_000
  const deltaLatitude = toRadians(end.latitude - start.latitude)
  const deltaLongitude = toRadians(end.longitude - start.longitude)
  const startLatitude = toRadians(start.latitude)
  const endLatitude = toRadians(end.latitude)
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(deltaLongitude / 2) ** 2

  return Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)))
}

const sameCredential = (left, right) => String(left ?? '').trim().toLowerCase() === String(right ?? '').trim().toLowerCase()
const allAccounts = () => [...bootstrapAccounts, ...store.approvedAccounts]
const pathMatch = (pathname, pattern) => pathname.match(pattern)
const nowSeconds = () => Math.floor(Date.now() / 1000)

const base64url = (value) => Buffer.from(value).toString('base64url')
const safeJsonParse = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const signTokenPart = (value) => createHmac('sha256', authSecret).update(value).digest('base64url')

const issueAccessToken = (account) => {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(
    JSON.stringify({
      email: account.email,
      exp: nowSeconds() + tokenTtlSeconds,
      jti: randomUUID(),
      loginId: account.loginId,
      name: account.name,
      organization: account.organization,
      role: account.role,
      sub: account.loginId,
    }),
  )
  const unsignedToken = `${header}.${payload}`
  return `${unsignedToken}.${signTokenPart(unsignedToken)}`
}

const verifyAccessToken = (token) => {
  const parts = String(token ?? '').split('.')
  if (parts.length !== 3) return null

  const [header, payload, signature] = parts
  const expectedSignature = signTokenPart(`${header}.${payload}`)
  const provided = Buffer.from(signature)
  const expected = Buffer.from(expectedSignature)
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null

  const claims = safeJsonParse(Buffer.from(payload, 'base64url').toString('utf8'))
  if (!claims || typeof claims !== 'object' || Number(claims.exp ?? 0) < nowSeconds()) return null

  const account = allAccounts().find(
    (item) =>
      sameCredential(item.loginId, claims.loginId) &&
      sameCredential(item.email, claims.email) &&
      item.role === claims.role,
  )
  return account ? sanitizeAccount(account) : null
}

const getBearerToken = (req) => {
  const header = String(req.headers.authorization ?? '')
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

const sanitizeAccount = (account) => ({
  email: account.email,
  id: account.id ?? account.loginId,
  loginId: account.loginId,
  loginLabel: account.loginLabel ?? loginLabelsByRole[account.role] ?? 'Assigned ID',
  name: account.name,
  organization: account.organization,
  role: account.role,
})

const sanitizeAccountRequest = (request) => {
  const { password, passwordHash, ...safeRequest } = request
  return safeRequest
}

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(email ?? '').trim())
const hashPassword = async (password) => bcrypt.hash(password, 12)
const verifyPassword = async (account, password) =>
  typeof account.passwordHash === 'string'
    ? bcrypt.compare(String(password ?? ''), account.passwordHash)
    : account.password === password

const loginAttempts = new Map()
const loginWindowMs = 15 * 60 * 1000
const maxLoginAttempts = Number(process.env.MAX_LOGIN_ATTEMPTS ?? 5)

const loginAttemptKey = (req, credential) =>
  `${req.socket.remoteAddress ?? 'local'}:${String(credential ?? '').trim().toLowerCase()}`

const isRateLimited = (req, credential) => {
  const key = loginAttemptKey(req, credential)
  const attempt = loginAttempts.get(key)
  if (!attempt) return false
  if (Date.now() > attempt.resetAt) {
    loginAttempts.delete(key)
    return false
  }
  return attempt.count >= maxLoginAttempts
}

const recordFailedLogin = (req, credential) => {
  const key = loginAttemptKey(req, credential)
  const current = loginAttempts.get(key)
  if (!current || Date.now() > current.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: Date.now() + loginWindowMs })
    return
  }
  current.count += 1
}

const clearFailedLogin = (req, credential) => {
  loginAttempts.delete(loginAttemptKey(req, credential))
}

const audit = async (action, actor, details = {}) => {
  const entry = {
    action,
    actorEmail: actor?.email ?? 'anonymous',
    actorLoginId: actor?.loginId ?? null,
    actorName: actor?.name ?? 'Anonymous',
    actorRole: actor?.role ?? 'anonymous',
    details,
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    occurredAt: new Date().toISOString(),
  }
  store.auditLogs.unshift(entry)
  store.auditLogs = store.auditLogs.slice(0, 1000)
  await saveData()
  return entry
}

const requireUser = (req, res, allowedRoles = []) => {
  const user = verifyAccessToken(getBearerToken(req))
  if (!user) {
    json(res, 401, { error: 'Authentication required' })
    return null
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    json(res, 403, { error: 'You do not have permission to perform this action' })
    return null
  }

  return user
}

const canAccessPlacement = (user, placement) => {
  if (!user || !placement) return false
  if (user.role === 'admin') return true
  if (user.role === 'intern') return sameCredential(placement.studentNo, user.loginId)
  if (user.role === 'companySupervisor') return sameCredential(placement.company, user.organization)
  if (user.role === 'universitySupervisor') return sameCredential(placement.university, user.organization)
  return false
}

const placementForStudent = (studentNo) =>
  placementsWithApprovedInterns().find((item) => sameCredential(item.studentNo, studentNo))

const canManageReport = (user, report) => {
  if (!user || !report) return false
  if (user.role === 'admin') return true
  if (user.role === 'companySupervisor') return sameCredential(report.company, user.organization)
  if (user.role === 'universitySupervisor') return sameCredential(report.university, user.organization)
  return false
}

const paginate = (items, url, searchFields = []) => {
  const query = String(url.searchParams.get('q') ?? '').trim().toLowerCase()
  const status = String(url.searchParams.get('status') ?? '').trim().toLowerCase()
  let filtered = [...items]

  if (query && searchFields.length > 0) {
    filtered = filtered.filter((item) =>
      searchFields.some((field) => String(item?.[field] ?? '').toLowerCase().includes(query)),
    )
  }

  if (status) {
    filtered = filtered.filter((item) => String(item?.status ?? '').toLowerCase() === status)
  }

  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? 50) || 50))
  const start = (page - 1) * pageSize
  return {
    items: filtered.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    },
  }
}

const storeCounts = (data = store) => ({
  accountRequests: data.accountRequests.length,
  announcements: data.announcements.length,
  attendanceEvents: data.attendanceEvents.length,
  approvedAccounts: data.approvedAccounts.length,
  auditLogs: data.auditLogs.length,
  complaints: data.complaints.length,
  documents: data.documents.length,
  evaluations: data.evaluations.length,
  placements: data.placements.length,
  reports: data.reports.length,
  tasks: data.tasks.length,
})

const createBackupPayload = () => ({
  data: store,
  exportedAt: new Date().toISOString(),
  system: 'Intern Nexus',
  version: 'local-json-v2',
})

const knownStaleLoginIds = new Set([
  'ICT/2023/018',
  'BIS/2023/044',
  'CS/2023/102',
  'SE/2023/087',
  'INT-001',
  '005',
  '006',
  '007',
  '008',
])

const looksLikeTestText = (value) => /\b(test|demo|sample|qa)\b/i.test(String(value ?? ''))
const isLikelyStaleLoginId = (value) => knownStaleLoginIds.has(String(value ?? '').trim().toUpperCase())

const cleanupCandidates = () => {
  const candidates = []
  const pushCandidate = (collection, itemId, label, reason) => {
    candidates.push({ collection, itemId, label, reason })
  }

  store.approvedAccounts.forEach((account) => {
    if (isLikelyStaleLoginId(account.loginId) || looksLikeTestText(`${account.email} ${account.name}`)) {
      pushCandidate('approvedAccounts', account.loginId, `${account.name} (${account.loginId})`, 'Likely localhost test account')
    }
  })

  store.accountRequests.forEach((request) => {
    if (isLikelyStaleLoginId(request.loginId) || looksLikeTestText(`${request.email} ${request.name}`)) {
      pushCandidate('accountRequests', request.id, `${request.name} (${request.loginId})`, 'Request belongs to likely test account')
    }
  })

  store.placements.forEach((placement) => {
    if (isLikelyStaleLoginId(placement.studentNo) || looksLikeTestText(`${placement.name} ${placement.company}`)) {
      pushCandidate('placements', placement.studentNo, `${placement.name} at ${placement.company}`, 'Placement belongs to likely test account')
    }
  })

  store.reports.forEach((report) => {
    if (
      isLikelyStaleLoginId(report.studentNo) ||
      looksLikeTestText(`${report.owner} ${report.title}`) ||
      !String(report.content ?? '').trim()
    ) {
      pushCandidate('reports', report.id, `${report.owner} ${report.periodStart ?? ''} - ${report.periodEnd ?? ''}`, 'Report is from test account or has incomplete content')
    }
  })

  store.attendanceEvents.forEach((event) => {
    if (isLikelyStaleLoginId(event.studentNo) || looksLikeTestText(`${event.internName} ${event.company}`)) {
      pushCandidate('attendanceEvents', event.id, `${event.internName} ${event.status}`, 'Attendance belongs to likely test account')
    }
  })

  store.tasks.forEach((task) => {
    if (looksLikeTestText(`${task.title} ${task.intern}`)) {
      pushCandidate('tasks', task.title, `${task.title} (${task.intern})`, 'Task looks like test data')
    }
  })

  return candidates
}

const cleanupPreview = () => {
  const candidates = cleanupCandidates()
  return {
    candidates,
    summary: candidates.reduce((summary, candidate) => {
      summary[candidate.collection] = (summary[candidate.collection] ?? 0) + 1
      return summary
    }, {}),
  }
}

const applyCleanup = async (user) => {
  const preview = cleanupPreview()
  const candidateIds = (collection) =>
    new Set(preview.candidates.filter((candidate) => candidate.collection === collection).map((candidate) => candidate.itemId))

  const accountIds = candidateIds('approvedAccounts')
  const requestIds = candidateIds('accountRequests')
  const placementIds = candidateIds('placements')
  const reportIds = candidateIds('reports')
  const attendanceIds = candidateIds('attendanceEvents')
  const taskTitles = candidateIds('tasks')
  const before = storeCounts()

  store.approvedAccounts = store.approvedAccounts.filter((account) => !accountIds.has(account.loginId))
  store.accountRequests = store.accountRequests.filter((request) => !requestIds.has(request.id))
  store.placements = store.placements.filter((placement) => !placementIds.has(placement.studentNo))
  store.reports = store.reports.filter((report) => !reportIds.has(report.id))
  store.attendanceEvents = store.attendanceEvents.filter((event) => !attendanceIds.has(event.id))
  store.tasks = store.tasks.filter((task) => !taskTitles.has(task.title))

  const after = storeCounts()
  await saveData()
  await audit('admin.cleanup_stale_data', user, { after, before, removed: preview.summary })
  return { after, before, removed: preview.summary }
}

const uniqueAccountExists = ({ email, loginId }) =>
  allAccounts().some((account) => sameCredential(account.email, email) || sameCredential(account.loginId, loginId)) ||
  store.accountRequests.some(
    (request) =>
      request.status !== 'Rejected' &&
      (sameCredential(request.email, email) || sameCredential(request.loginId, loginId)),
  )

const createApprovedAccount = (request) => ({
  email: request.email,
  loginId: request.loginId,
  loginLabel: request.loginLabel,
  name: request.name,
  organization: request.organization,
  passwordHash: request.passwordHash,
  role: request.role,
})

const migrateStoredSecrets = async () => {
  let changed = false
  const accountCollections = [store.approvedAccounts, store.accountRequests]

  for (const collection of accountCollections) {
    for (const item of collection) {
      if (item?.password && !item.passwordHash) {
        item.passwordHash = await hashPassword(item.password)
        delete item.password
        changed = true
      } else if (item?.password) {
        delete item.password
        changed = true
      }
    }
  }

  if (changed) {
    await saveData()
  }
}

const placementStatuses = new Set(['Active', 'Late', 'Needs review', 'On leave'])

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const positiveNumberOrNull = (value) => {
  const parsed = numberOrNull(value)
  return parsed !== null && parsed > 0 ? parsed : null
}

const clampScore = (value) => {
  const score = Number(value)
  if (!Number.isFinite(score)) return 0
  return Math.min(100, Math.max(0, Math.round(score)))
}

const normalizeLookupText = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const companySiteForName = (companyName) => {
  const query = normalizeLookupText(companyName)
  if (!query) return null

  return (
    companySites.find((site) => [site.name, ...(site.aliases ?? [])].some((name) => normalizeLookupText(name) === query)) ??
    companySites.find((site) => {
      const names = [site.name, ...(site.aliases ?? [])].map(normalizeLookupText)
      return query.length >= 4 && names.some((name) => name.includes(query) || query.includes(name))
    }) ??
    null
  )
}

const explicitSiteFromPlacement = (placement) => {
  const latitude = numberOrNull(placement?.companyLatitude)
  const longitude = numberOrNull(placement?.companyLongitude)
  const radiusMeters = positiveNumberOrNull(placement?.radiusMeters)

  if (latitude === null || longitude === null) return null

  return {
    name: placement.company,
    latitude,
    longitude,
    radiusMeters: radiusMeters ?? fallbackCompanySite.radiusMeters,
  }
}

const siteForPlacement = (placement) => explicitSiteFromPlacement(placement) ?? companySiteForName(placement?.company)

const enrichPlacement = (placement) => {
  const site = siteForPlacement(placement)

  return {
    ...placement,
    companyAddress: placement.companyAddress ?? site?.address ?? null,
    companyLatitude: site?.latitude ?? numberOrNull(placement.companyLatitude),
    companyLongitude: site?.longitude ?? numberOrNull(placement.companyLongitude),
    radiusMeters: site?.radiusMeters ?? positiveNumberOrNull(placement.radiusMeters) ?? fallbackCompanySite.radiusMeters,
  }
}

const createPlacementFromAccount = (account) => ({
  attendance: 0,
  company: 'Unassigned company',
  companyAddress: null,
  companyLatitude: null,
  companyLongitude: null,
  department: 'Awaiting department',
  name: account.name,
  performance: 0,
  radiusMeters: fallbackCompanySite.radiusMeters,
  studentNo: account.loginId,
  status: 'Needs review',
  supervisor: 'Awaiting supervisor',
  university: account.organization,
})

const normalizePlacement = (body) => {
  const status = placementStatuses.has(body.status) ? body.status : 'Needs review'
  const company = String(body.company ?? '').trim()
  const knownSite = companySiteForName(company)
  const companyLatitude = numberOrNull(body.companyLatitude) ?? knownSite?.latitude ?? null
  const companyLongitude = numberOrNull(body.companyLongitude) ?? knownSite?.longitude ?? null
  const radiusMeters = positiveNumberOrNull(body.radiusMeters) ?? knownSite?.radiusMeters ?? fallbackCompanySite.radiusMeters

  return {
    attendance: clampScore(body.attendance),
    company,
    companyAddress: String(body.companyAddress ?? knownSite?.address ?? '').trim() || null,
    companyLatitude,
    companyLongitude,
    department: String(body.department ?? '').trim() || 'General',
    name: String(body.name ?? '').trim(),
    performance: clampScore(body.performance),
    radiusMeters,
    studentNo: String(body.studentNo ?? '').trim(),
    status,
    supervisor: String(body.supervisor ?? '').trim() || 'Awaiting supervisor',
    university: String(body.university ?? '').trim() || 'Not specified',
  }
}

const placementsWithApprovedInterns = () => {
  const placements = [...store.placements]

  store.approvedAccounts
    .filter((account) => account.role === 'intern')
    .forEach((account) => {
      const exists = placements.some((placement) => sameCredential(placement.studentNo, account.loginId))
      if (!exists) {
        placements.push(createPlacementFromAccount(account))
      }
    })

  return placements.map(enrichPlacement)
}

const uniqueStrings = (values) =>
  Array.from(new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean)))

const nominatimLookup = async (searchText) => {
  const endpoint = new URL('https://nominatim.openstreetmap.org/search')
  endpoint.searchParams.set('addressdetails', '1')
  endpoint.searchParams.set('countrycodes', 'ug')
  endpoint.searchParams.set('format', 'jsonv2')
  endpoint.searchParams.set('limit', '1')
  endpoint.searchParams.set('q', searchText)

  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'InternNexus-localhost/1.0',
    },
  })

  if (!response.ok) {
    throw new Error('Location lookup service unavailable')
  }

  const results = await response.json()
  const firstResult = Array.isArray(results) ? results[0] : null
  const latitude = Number(firstResult?.lat)
  const longitude = Number(firstResult?.lon)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  return {
    address: firstResult.display_name ?? searchText,
    latitude,
    longitude,
    name: firstResult.name ?? searchText,
    radiusMeters: fallbackCompanySite.radiusMeters,
    source: 'openstreetmap-nominatim',
  }
}

const photonLookup = async (searchText) => {
  const endpoint = new URL('https://photon.komoot.io/api/')
  endpoint.searchParams.set('lat', String(fallbackCompanySite.latitude))
  endpoint.searchParams.set('limit', '1')
  endpoint.searchParams.set('lon', String(fallbackCompanySite.longitude))
  endpoint.searchParams.set('q', searchText)

  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'InternNexus-localhost/1.0',
    },
  })

  if (!response.ok) return null

  const result = await response.json()
  const feature = Array.isArray(result?.features) ? result.features[0] : null
  const [longitude, latitude] = Array.isArray(feature?.geometry?.coordinates)
    ? feature.geometry.coordinates
    : [null, null]

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  const properties = feature.properties ?? {}
  const address = uniqueStrings([
    properties.name,
    properties.street,
    properties.district,
    properties.city,
    properties.state,
    properties.country,
  ]).join(', ')

  return {
    address: address || searchText,
    latitude,
    longitude,
    name: properties.name ?? searchText,
    radiusMeters: fallbackCompanySite.radiusMeters,
    source: 'openstreetmap-photon',
  }
}

const geocodeCompany = async (query, address = '') => {
  const company = String(query ?? '').trim()
  if (!company) return null

  const knownSite = companySiteForName(company)
  if (knownSite) {
    return {
      address: knownSite.address ?? knownSite.name,
      latitude: knownSite.latitude,
      longitude: knownSite.longitude,
      name: knownSite.name,
      radiusMeters: knownSite.radiusMeters,
      source: 'local-company-directory',
    }
  }

  const locationHint = String(address ?? '').trim()
  const countrySuffix = company.toLowerCase().includes(defaultGeocodeCountry.toLowerCase()) ? '' : defaultGeocodeCountry
  const searchTexts = uniqueStrings([
    locationHint && `${company}, ${locationHint}`,
    locationHint && `${company}, ${locationHint}, ${defaultGeocodeCountry}`,
    `${company}, Kampala, ${defaultGeocodeCountry}`,
    countrySuffix ? `${company}, ${countrySuffix}` : company,
    company,
    locationHint && `${locationHint}, ${defaultGeocodeCountry}`,
  ])

  for (const searchText of searchTexts) {
    const result = await nominatimLookup(searchText)
    if (result) return { ...result, searchedFor: searchText }
  }

  for (const searchText of searchTexts) {
    const result = await photonLookup(searchText)
    if (result) return { ...result, searchedFor: searchText }
  }

  return null
}

const createAttendanceEvent = ({ companySite, distance, geofencePassed, gps, placement, type }) => {
  const checkedIn = type === 'check-in'
  const occurredAt = new Date()
  const actionLabel = checkedIn ? 'checked in' : 'checked out'
  const distanceText = typeof distance === 'number' ? `${distance} m from ${companySite.name}` : companySite.name
  const event = {
    audience: 'University Supervisor',
    category: 'Attendance',
    company: placement.company,
    distanceMeters: distance ?? null,
    geofencePassed: Boolean(geofencePassed),
    gpsAccuracyMeters: gps?.accuracy ?? null,
    id: `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    internName: placement.name,
    message: `${placement.name} ${actionLabel} at ${placement.company}. ${checkedIn ? distanceText : 'Shift ended.'}`,
    occurredAt: occurredAt.toLocaleString(),
    status: checkedIn ? 'Working' : 'Checked out',
    studentNo: placement.studentNo,
    title: `${placement.name} ${checkedIn ? 'checked in' : 'checked out'}`,
    type,
    university: placement.university,
  }
  store.attendanceEvents.unshift(event)
  store.attendanceEvents = store.attendanceEvents.slice(0, 100)
  return event
}

const reportsForViewer = (user) => {
  if (user.role === 'admin') return store.reports

  if (user.role === 'intern') {
    return store.reports.filter(
      (report) => sameCredential(report.studentNo, user.loginId) || sameCredential(report.owner, user.name),
    )
  }

  if (user.role === 'companySupervisor') {
    return store.reports.filter(
      (report) =>
        sameCredential(report.company, user.organization),
    )
  }

  if (user.role === 'universitySupervisor') {
    return store.reports.filter(
      (report) =>
        sameCredential(report.university, user.organization),
    )
  }

  return []
}

const createReportRecord = (body, user) => {
  const placement = user.role === 'intern' ? placementForStudent(user.loginId) : placementForStudent(body.studentNo)
  const owner = String(user.role === 'intern' ? user.name : body.owner ?? body.studentName ?? '').trim()
  const studentNo = String(user.role === 'intern' ? user.loginId : body.studentNo ?? '').trim()
  const company = String(body.company ?? placement?.company ?? '').trim()
  const university = String(body.university ?? placement?.university ?? user.organization ?? '').trim()
  const periodStart = String(body.periodStart ?? '').trim()
  const periodEnd = String(body.periodEnd ?? '').trim()
  const content = String(body.content ?? '').trim()
  const hoursWorked = Number(body.hoursWorked)
  const startDate = Date.parse(periodStart)
  const endDate = Date.parse(periodEnd)

  if (!owner || !studentNo || !company || !university || !periodStart || !periodEnd) {
    return null
  }

  if (!Number.isFinite(startDate) || !Number.isFinite(endDate) || startDate > endDate) {
    return { error: 'Report period dates are invalid.' }
  }

  if (!Number.isFinite(hoursWorked) || hoursWorked <= 0 || hoursWorked > 168) {
    return { error: 'Hours worked must be a number between 1 and 168.' }
  }

  if (content.length < 40) {
    return { error: 'Report content is too short. Add work done, skills learned, and next plan.' }
  }

  const duplicate = store.reports.some(
    (report) =>
      sameCredential(report.studentNo, studentNo) &&
      report.periodStart === periodStart &&
      report.periodEnd === periodEnd &&
      report.status !== 'Rejected',
  )
  if (duplicate) {
    return { error: 'A report for this student and reporting period already exists.' }
  }

  return {
    company,
    companyApprovedAt: null,
    companyApprovedBy: null,
    content,
    department: String(body.department ?? placement?.department ?? '').trim(),
    hoursWorked: String(hoursWorked),
    id: `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    owner,
    periodEnd,
    periodStart,
    reviewer: 'Company Supervisor',
    status: 'Pending company approval',
    studentNo,
    submitted: new Date().toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }),
    title: String(body.title ?? `Daily internship report ${periodEnd}`).trim(),
    type: 'Daily report',
    university,
    universityApprovedAt: null,
    universityApprovedBy: null,
  }
}

const evaluationsForViewer = (user) => {
  if (user.role === 'admin') return store.evaluations

  if (user.role === 'intern') {
    return store.evaluations.filter(
      (evaluation) =>
        sameCredential(evaluation.studentNo, user.loginId) ||
        sameCredential(evaluation.internName, user.name),
    )
  }

  if (user.role === 'companySupervisor') {
    return store.evaluations.filter((evaluation) => sameCredential(evaluation.company, user.organization))
  }

  if (user.role === 'universitySupervisor') {
    return store.evaluations.filter((evaluation) => sameCredential(evaluation.university, user.organization))
  }

  return []
}

const attendanceEventsForViewer = (user) => {
  if (user.role === 'admin') return store.attendanceEvents
  if (user.role === 'intern') {
    return store.attendanceEvents.filter((event) => sameCredential(event.studentNo, user.loginId))
  }
  if (user.role === 'companySupervisor') {
    return store.attendanceEvents.filter((event) => sameCredential(event.company, user.organization))
  }
  if (user.role === 'universitySupervisor') {
    return store.attendanceEvents.filter((event) => sameCredential(event.university, user.organization))
  }
  return []
}

const complaintsForViewer = (user) => {
  if (user.role === 'admin') return store.complaints
  if (user.role === 'intern') {
    return store.complaints.filter((complaint) => sameCredential(complaint.submittedBy, user.name))
  }
  if (user.role === 'companySupervisor') {
    return store.complaints.filter(
      (complaint) =>
        complaint.audience === 'Company Supervisor' ||
        sameCredential(complaint.submittedBy, user.name),
    )
  }
  if (user.role === 'universitySupervisor') {
    return store.complaints.filter(
      (complaint) =>
        complaint.audience === 'University Supervisor' ||
        sameCredential(complaint.submittedBy, user.name),
    )
  }
  return []
}

const tasksForViewer = (user) => {
  if (user.role === 'admin') return store.tasks
  if (user.role === 'intern') {
    return store.tasks.filter((task) => sameCredential(task.intern, user.name) || sameCredential(task.studentNo, user.loginId))
  }
  if (user.role === 'companySupervisor') {
    const assignedPlacements = placementsWithApprovedInterns()
      .filter((placement) => sameCredential(placement.company, user.organization))
    return store.tasks.filter((task) =>
      assignedPlacements.some(
        (placement) =>
          sameCredential(task.studentNo, placement.studentNo) ||
          sameCredential(task.intern, placement.name) ||
          sameCredential(task.company, placement.company),
      ),
    )
  }
  return []
}

const canManageTask = (user, task) => {
  if (!user || !task) return false
  if (user.role === 'admin') return true
  if (user.role === 'intern') {
    return sameCredential(task.studentNo, user.loginId) || sameCredential(task.intern, user.name)
  }
  if (user.role === 'companySupervisor') {
    const placement =
      placementForStudent(task.studentNo) ??
      placementsWithApprovedInterns().find((item) => sameCredential(item.name, task.intern))
    return Boolean(placement && canAccessPlacement(user, placement))
  }
  return false
}

const cleanTaskText = (value, limit = 1500) => String(value ?? '').trim().slice(0, limit)

const cleanEvidenceUrl = (value) => {
  const evidenceUrl = cleanTaskText(value, 500)
  if (!evidenceUrl) return ''

  try {
    const parsed = new URL(evidenceUrl)
    return ['http:', 'https:'].includes(parsed.protocol) ? evidenceUrl : null
  } catch {
    return null
  }
}

const taskProgressForStatus = (task, status) => {
  if (status === 'Completed') return 100
  if (status === 'Submitted') return Math.max(Number(task.progress ?? 0), 90)
  if (status === 'Needs correction' || status === 'Rejected') return Math.max(Number(task.progress ?? 0), 65)
  if (status === 'In Progress') return Math.max(Number(task.progress ?? 0), 50)
  return Number(task.progress ?? 0)
}

const announcementsForViewer = (user) =>
  store.announcements.filter((announcement) => {
    if (announcement.audience === 'All users') return true
    if (user.role === 'admin') return announcement.audience === 'Administrators'
    if (user.role === 'intern') return announcement.audience === 'Interns'
    if (user.role === 'companySupervisor') return announcement.audience === 'Company supervisors'
    if (user.role === 'universitySupervisor') return announcement.audience === 'University supervisors'
    return false
  })

const documentsForViewer = (user) =>
  store.documents.filter((documentRecord) => {
    if (user.role === 'admin') return true
    if (documentRecord.audience === 'All interns') return user.role === 'intern'
    if (documentRecord.audience === 'Assigned interns') return user.role === 'intern' || user.role === 'companySupervisor'
    if (documentRecord.audience === 'University supervisors') return user.role === 'universitySupervisor'
    if (documentRecord.audience === 'Supervisors') return ['companySupervisor', 'universitySupervisor'].includes(user.role)
    return false
  })

const allowedDocumentTypes = {
  '.doc': {
    fileType: 'DOC',
    mimeTypes: ['application/msword', 'application/octet-stream'],
  },
  '.docx': {
    fileType: 'DOCX',
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'],
  },
  '.pdf': {
    fileType: 'PDF',
    mimeTypes: ['application/pdf', 'application/octet-stream'],
  },
}

const validateDocumentUpload = (body) => {
  const fileName = basename(String(body.fileName ?? body.title ?? ''))
  const extension = extname(fileName).toLowerCase()
  const typeConfig = allowedDocumentTypes[extension]
  const mimeType = String(body.mimeType ?? '')
  const base64Data = String(body.contentBase64 ?? '')
  const sizeBytes = Number(body.sizeBytes ?? 0)

  if (!fileName || !typeConfig) {
    return { error: 'Only PDF, DOC, and DOCX files are allowed.' }
  }

  if (mimeType && !typeConfig.mimeTypes.includes(mimeType)) {
    return { error: 'The uploaded file MIME type does not match the allowed document type.' }
  }

  if (!base64Data) {
    return { error: 'Uploaded file content is required.' }
  }

  const bytes = Buffer.from(base64Data, 'base64')
  if (!bytes.length || bytes.length > maxUploadBytes || (sizeBytes && sizeBytes > maxUploadBytes)) {
    return { error: `Document size must be between 1 byte and ${Math.round(maxUploadBytes / 1024 / 1024)} MB.` }
  }

  const executableSignatures = ['MZ', '#!']
  const firstBytes = bytes.subarray(0, 2).toString('utf8')
  if (executableSignatures.includes(firstBytes)) {
    return { error: 'Executable files are not allowed.' }
  }

  return { bytes, fileName, fileType: typeConfig.fileType, mimeType: mimeType || typeConfig.mimeTypes[0] }
}

await migrateStoredSecrets()

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

  if (req.method === 'OPTIONS') {
    json(res, 200, { ok: true })
    return
  }

  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      json(res, 200, {
        auditQueue: store.accountRequests.filter((request) => request.status === 'Pending').length + store.complaints.filter((complaint) => complaint.status !== 'Resolved').length,
        database: 'local-json-store',
        generatedAt: new Date().toISOString(),
        realtime: 'socket-ready',
        status: 'online',
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/dashboard') {
      const user = requireUser(req, res)
      if (!user) return
      const visiblePlacements = placementsWithApprovedInterns().filter((placement) => canAccessPlacement(user, placement))
      const visibleReports = reportsForViewer(user)
      const visibleComplaints = complaintsForViewer(user)
      const activePlacements = visiblePlacements.filter((placement) => placement.status === 'Active').length
      const pendingReports = visibleReports.filter((report) => !['Approved', 'Rejected'].includes(report.status)).length
      json(res, 200, {
        role: user.role,
        metrics: [
          `${visiblePlacements.length} placements`,
          `${activePlacements} active placements`,
          `${pendingReports} pending reports`,
        ],
        notifications: [
          `${store.accountRequests.filter((request) => request.status === 'Pending').length} account requests pending`,
          `${visibleComplaints.filter((complaint) => complaint.status !== 'Resolved').length} complaints need action`,
          `${tasksForViewer(user).filter((task) => task.status === 'Overdue').length} overdue tasks`,
        ],
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/accounts/approved') {
      const user = requireUser(req, res, ['admin'])
      if (!user) return
      const { items, pagination } = paginate(store.approvedAccounts.map(sanitizeAccount), url, [
        'email',
        'loginId',
        'name',
        'organization',
        'role',
      ])
      json(res, 200, { accounts: items, pagination })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readBody(req)
      const credential = String(body.credential ?? body.email ?? '').toLowerCase()
      if (isRateLimited(req, credential)) {
        await audit('login.rate_limited', null, { credential })
        json(res, 429, { error: 'Too many failed login attempts. Try again later.' })
        return
      }
      const account = allAccounts().find(
        (item) =>
          [item.email.toLowerCase(), item.loginId.toLowerCase()].includes(credential),
      )

      if (!account || !(await verifyPassword(account, body.password))) {
        recordFailedLogin(req, credential)
        await audit('login.failed', account ? sanitizeAccount(account) : null, { credential })
        json(res, 401, { error: 'Invalid ID/email or password' })
        return
      }

      clearFailedLogin(req, credential)
      const safeAccount = sanitizeAccount(account)
      const accessToken = issueAccessToken(account)
      await audit('login.succeeded', safeAccount)
      json(res, 200, {
        accessToken,
        expiresIn: tokenTtlSeconds,
        refreshToken: `local-refresh-${randomUUID()}`,
        user: safeAccount,
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/account-requests') {
      const user = requireUser(req, res, ['admin'])
      if (!user) return
      const { items, pagination } = paginate(store.accountRequests.map(sanitizeAccountRequest), url, [
        'email',
        'loginId',
        'name',
        'organization',
        'role',
        'status',
      ])
      json(res, 200, { requests: items, pagination })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/account-requests') {
      const body = await readBody(req)
      const email = String(body.email ?? '').trim()
      const loginId = String(body.loginId ?? '').trim()
      const name = String(body.name ?? '').trim()
      const organization = String(body.organization ?? '').trim()
      const password = String(body.password ?? '')
      const role = String(body.role ?? 'intern')

      if (!['intern', 'companySupervisor', 'universitySupervisor'].includes(role)) {
        json(res, 422, { error: 'Select a valid account role.' })
        return
      }

      if (!email || !isValidEmail(email) || !loginId || !name || !organization || password.length < 8) {
        json(res, 422, { error: 'Name, valid email, assigned ID, organization, and an 8-character password are required' })
        return
      }

      if (uniqueAccountExists({ email, loginId })) {
        json(res, 409, { error: 'That email or assigned ID already exists or is pending approval' })
        return
      }

      const request = {
        email,
        id: `REQ-${Date.now()}`,
        loginId,
        loginLabel: loginLabelsByRole[role] ?? 'Assigned ID',
        name,
        note: String(body.note ?? '').trim(),
        organization,
        passwordHash: await hashPassword(password),
        requestedAt: new Date().toLocaleString(),
        role,
        status: 'Pending',
      }
      store.accountRequests.unshift(request)
      await saveData()
      await audit('account_request.created', sanitizeAccountRequest(request), { role })
      json(res, 201, { request: sanitizeAccountRequest(request) })
      return
    }

    const accountReviewMatch = pathMatch(url.pathname, /^\/api\/account-requests\/([^/]+)\/review$/)
    if (req.method === 'PATCH' && accountReviewMatch) {
      const user = requireUser(req, res, ['admin'])
      if (!user) return
      const body = await readBody(req)
      const status = body.status === 'Approved' ? 'Approved' : body.status === 'Rejected' ? 'Rejected' : null
      const request = store.accountRequests.find((item) => item.id === decodeURIComponent(accountReviewMatch[1]))

      if (!status || !request) {
        json(res, 404, { error: 'Account request not found or status is invalid' })
        return
      }

      request.status = status
      request.reviewedAt = new Date().toLocaleString()
      let account = null

      if (status === 'Approved') {
        account = createApprovedAccount(request)
        const exists = store.approvedAccounts.some(
          (item) => sameCredential(item.email, account.email) || sameCredential(item.loginId, account.loginId),
        )
        if (!exists) {
          store.approvedAccounts.push(account)
        }

        if (account.role === 'intern') {
          const placementExists = store.placements.some((placement) => sameCredential(placement.studentNo, account.loginId))
          if (!placementExists) {
            store.placements.unshift(createPlacementFromAccount(account))
          }
        }
      }

      await saveData()
      await audit(status === 'Approved' ? 'account.approved' : 'account.rejected', user, {
        requestId: request.id,
        targetLoginId: request.loginId,
        targetRole: request.role,
      })
      json(res, 200, { account: account ? sanitizeAccount(account) : null, request: sanitizeAccountRequest(request) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/placements') {
      const user = requireUser(req, res)
      if (!user) return
      const visiblePlacements = placementsWithApprovedInterns().filter((placement) => canAccessPlacement(user, placement))
      const { items, pagination } = paginate(visiblePlacements, url, [
        'name',
        'studentNo',
        'company',
        'university',
        'supervisor',
        'status',
      ])
      json(res, 200, { placements: items, pagination })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/geocode/company') {
      const user = requireUser(req, res, ['admin'])
      if (!user) return
      const query = url.searchParams.get('query') ?? ''
      const address = url.searchParams.get('address') ?? ''
      if (!query.trim()) {
        json(res, 422, { error: 'Company name is required' })
        return
      }

      const result = await geocodeCompany(query, address)
      if (!result) {
        json(res, 404, { error: 'No coordinates found. Add the branch, road, town, or district and try again.' })
        return
      }

      json(res, 200, { result })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/placements') {
      const user = requireUser(req, res, ['admin'])
      if (!user) return
      const body = await readBody(req)
      const placement = normalizePlacement(body)

      if (!placement.name || !placement.studentNo || !placement.company) {
        json(res, 422, { error: 'Intern name, student number, and company are required' })
        return
      }

      const existingIndex = store.placements.findIndex((item) => sameCredential(item.studentNo, placement.studentNo))
      if (existingIndex >= 0) {
        store.placements[existingIndex] = placement
      } else {
        store.placements.unshift(placement)
      }

      await saveData()
      await audit(existingIndex >= 0 ? 'placement.updated' : 'placement.created', user, {
        company: placement.company,
        studentNo: placement.studentNo,
      })
      json(res, existingIndex >= 0 ? 200 : 201, { placement })
      return
    }

    const internDeleteMatch = pathMatch(url.pathname, /^\/api\/interns\/([^/]+)$/)
    if (req.method === 'DELETE' && internDeleteMatch) {
      const user = requireUser(req, res, ['admin'])
      if (!user) return
      const studentNo = decodeURIComponent(internDeleteMatch[1])
      const bootstrapAccount = bootstrapAccounts.find(
        (account) => account.role === 'intern' && sameCredential(account.loginId, studentNo),
      )

      if (bootstrapAccount) {
        json(res, 409, { error: 'Built-in account cannot be deleted. Delete created intern accounts instead.' })
        return
      }

      const placement = store.placements.find((item) => sameCredential(item.studentNo, studentNo))
      const account = store.approvedAccounts.find(
        (item) => item.role === 'intern' && sameCredential(item.loginId, studentNo),
      )
      const internName = placement?.name ?? account?.name ?? studentNo
      const before = {
        accountRequests: store.accountRequests.length,
        approvedAccounts: store.approvedAccounts.length,
        attendanceEvents: store.attendanceEvents.length,
        placements: store.placements.length,
        tasks: store.tasks.length,
      }

      store.accountRequests = store.accountRequests.filter((request) => !sameCredential(request.loginId, studentNo))
      store.approvedAccounts = store.approvedAccounts.filter((item) => !sameCredential(item.loginId, studentNo))
      store.attendanceEvents = store.attendanceEvents.filter((item) => !sameCredential(item.studentNo, studentNo))
      store.placements = store.placements.filter((item) => !sameCredential(item.studentNo, studentNo))
      store.tasks = store.tasks.filter((task) => !sameCredential(task.intern, internName))

      const deleted = {
        accountRequests: before.accountRequests - store.accountRequests.length,
        approvedAccounts: before.approvedAccounts - store.approvedAccounts.length,
        attendanceEvents: before.attendanceEvents - store.attendanceEvents.length,
        placements: before.placements - store.placements.length,
        tasks: before.tasks - store.tasks.length,
      }

      if (
        !deleted.accountRequests &&
        !deleted.approvedAccounts &&
        !deleted.attendanceEvents &&
        !deleted.placements &&
        !deleted.tasks
      ) {
        json(res, 404, { error: 'Intern not found' })
        return
      }

      await saveData()
      await audit('intern.deleted', user, { deleted, internName, studentNo })
      json(res, 200, { deleted, internName, studentNo })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/announcements') {
      const user = requireUser(req, res)
      if (!user) return
      const { items, pagination } = paginate(announcementsForViewer(user), url, ['audience', 'author', 'message', 'title'])
      json(res, 200, { announcements: items, pagination })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/announcements') {
      const user = requireUser(req, res, ['admin'])
      if (!user) return
      const body = await readBody(req)
      const title = String(body.title ?? '').trim()
      const message = String(body.message ?? '').trim()
      if (!title || !message) {
        json(res, 422, { error: 'Announcement title and message are required' })
        return
      }
      const announcement = {
        audience: body.audience ?? 'All users',
        author: user.name,
        createdAt: new Date().toLocaleString(),
        id: `ANN-${Date.now()}`,
        message,
        title,
      }
      store.announcements.unshift(announcement)
      await saveData()
      await audit('announcement.created', user, { announcementId: announcement.id, audience: announcement.audience })
      json(res, 201, { announcement })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/tasks') {
      const user = requireUser(req, res)
      if (!user) return
      const { items, pagination } = paginate(tasksForViewer(user), url, ['title', 'intern', 'priority', 'status'])
      json(res, 200, { tasks: items, pagination })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/tasks') {
      const user = requireUser(req, res, ['admin', 'companySupervisor'])
      if (!user) return
      const body = await readBody(req)
      const title = String(body.title ?? '').trim()
      if (!title) {
        json(res, 422, { error: 'Task title is required' })
        return
      }
      const placement =
        placementForStudent(body.studentNo) ??
        placementsWithApprovedInterns().find((item) => sameCredential(item.name, body.intern))
      if (!placement) {
        json(res, 422, { error: 'Select an assigned intern before creating the task.' })
        return
      }
      if (user.role === 'companySupervisor' && !canAccessPlacement(user, placement)) {
        json(res, 403, { error: 'You can only assign tasks to interns at your company.' })
        return
      }
      const task = {
        attachments: Math.max(0, Number(body.attachments ?? 0) || 0),
        company: placement.company,
        deadline: body.deadline ?? 'Jul 05',
        id: `TASK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        intern: placement.name,
        priority: body.priority ?? 'Medium',
        progress: clampScore(body.progress ?? 0),
        studentNo: placement.studentNo,
        status: 'Pending',
        title,
        university: placement.university,
      }
      store.tasks.unshift(task)
      await saveData()
      await audit('task.created', user, { intern: task.intern, title: task.title })
      json(res, 201, { task })
      return
    }

    const taskUpdateMatch = pathMatch(url.pathname, /^\/api\/tasks\/([^/]+)$/)
    if (req.method === 'PATCH' && taskUpdateMatch) {
      const user = requireUser(req, res, ['admin', 'intern', 'companySupervisor'])
      if (!user) return
      const taskKey = decodeURIComponent(taskUpdateMatch[1])
      const task = store.tasks.find((item) => sameCredential(item.id, taskKey) || sameCredential(item.title, taskKey))
      if (!task) {
        json(res, 404, { error: 'Task not found' })
        return
      }
      if (!canManageTask(user, task)) {
        json(res, 403, { error: 'You are not allowed to update this task.' })
        return
      }

      const body = await readBody(req)
      const requestedStatus = cleanTaskText(body.status, 40)
      const allowedStatuses = new Set(['Pending', 'In Progress', 'Submitted', 'Needs correction', 'Completed', 'Overdue', 'Rejected'])
      if (!allowedStatuses.has(requestedStatus)) {
        json(res, 422, { error: 'Choose a valid task status.' })
        return
      }

      if (user.role === 'intern') {
        const internCanStart =
          requestedStatus === 'In Progress' && ['Pending', 'Needs correction', 'Rejected'].includes(task.status)
        const internCanSubmit =
          requestedStatus === 'Submitted' && ['In Progress', 'Overdue', 'Needs correction', 'Rejected'].includes(task.status)

        if (!internCanStart && !internCanSubmit) {
          json(res, 403, { error: 'Interns can only start tasks or submit them for supervisor review.' })
          return
        }

        if (internCanSubmit) {
          const submissionNote = cleanTaskText(body.submissionNote)
          const evidenceUrl = cleanEvidenceUrl(body.evidenceUrl)
          if (!submissionNote) {
            json(res, 422, { error: 'Add a work summary before submitting the task.' })
            return
          }
          if (evidenceUrl === null) {
            json(res, 422, { error: 'Evidence link must start with http:// or https://.' })
            return
          }

          task.submissionNote = submissionNote
          task.evidenceUrl = evidenceUrl
          task.attachments = evidenceUrl ? 1 : 0
          task.submittedAt = new Date().toLocaleString()
          delete task.reviewComment
          delete task.reviewedAt
          delete task.reviewedBy
        }
      } else {
        const supervisorCanReview =
          ['admin', 'companySupervisor'].includes(user.role) &&
          ['Completed', 'Needs correction', 'Rejected'].includes(requestedStatus) &&
          task.status === 'Submitted'

        if (!supervisorCanReview) {
          json(res, 403, { error: 'Supervisors can only approve or return submitted tasks.' })
          return
        }

        const reviewComment = cleanTaskText(body.reviewComment, 1000)
        if (['Needs correction', 'Rejected'].includes(requestedStatus) && !reviewComment) {
          json(res, 422, { error: 'Add a review comment before returning the task.' })
          return
        }

        task.reviewComment = reviewComment
        task.reviewedAt = new Date().toLocaleString()
        task.reviewedBy = user.name
      }

      task.status = requestedStatus
      task.progress = clampScore(taskProgressForStatus(task, requestedStatus))

      if (!task.id) task.id = `TASK-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      await saveData()
      await audit('task.updated', user, { status: task.status, taskId: task.id, title: task.title })
      json(res, 200, { task })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/evaluations') {
      const user = requireUser(req, res)
      if (!user) return
      const { items, pagination } = paginate(evaluationsForViewer(user), url, [
        'internName',
        'studentNo',
        'company',
        'university',
        'evaluatedBy',
      ])
      json(res, 200, { evaluations: items, pagination })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/evaluations') {
      const user = requireUser(req, res, ['admin', 'companySupervisor'])
      if (!user) return
      const body = await readBody(req)
      const internName = String(body.internName ?? '').trim()
      const studentNo = String(body.studentNo ?? '').trim()
      const company = String(body.company ?? '').trim()
      const university = String(body.university ?? '').trim()

      if (!internName || !studentNo || !company || !university) {
        json(res, 422, { error: 'Intern name, student number, company, and university are required.' })
        return
      }

      const placement = placementForStudent(studentNo)
      if (!placement || (user.role !== 'admin' && !canAccessPlacement(user, placement))) {
        json(res, 403, { error: 'You can only evaluate interns assigned to your company.' })
        return
      }

      const evaluation = {
        attendanceScore: clampScore(body.attendanceScore),
        comments: String(body.comments ?? '').trim(),
        communicationScore: clampScore(body.communicationScore),
        company,
        createdAt: new Date().toLocaleString(),
        evaluatedBy: user.name,
        id: `EVAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        initiativeScore: clampScore(body.initiativeScore),
        internName,
        overallScore: clampScore(body.overallScore),
        professionalismScore: clampScore(body.professionalismScore),
        studentNo,
        technicalScore: clampScore(body.technicalScore),
        teamworkScore: clampScore(body.teamworkScore),
        university,
      }
      store.evaluations.unshift(evaluation)
      await saveData()
      await audit('evaluation.created', user, { evaluationId: evaluation.id, studentNo })
      json(res, 201, { evaluation })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/messages') {
      const user = requireUser(req, res, ['admin'])
      if (!user) return
      json(res, 200, { messages: store.messages })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/messages') {
      const user = requireUser(req, res, ['admin'])
      if (!user) return
      const body = await readBody(req)
      const text = String(body.text ?? '').trim()
      if (!text) {
        json(res, 422, { error: 'Message text is required' })
        return
      }
      const message = {
        author: body.author ?? 'You',
        role: body.role ?? 'Current session',
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      store.messages.push(message)
      await saveData()
      json(res, 201, { message })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/complaints') {
      const user = requireUser(req, res)
      if (!user) return
      const { items, pagination } = paginate(complaintsForViewer(user), url, [
        'id',
        'title',
        'submittedBy',
        'audience',
        'category',
        'status',
        'priority',
      ])
      json(res, 200, { complaints: items, pagination })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/complaints') {
      const user = requireUser(req, res)
      if (!user) return
      const body = await readBody(req)
      const title = String(body.title ?? '').trim()
      if (!title) {
        json(res, 422, { error: 'Complaint title is required' })
        return
      }
      const category = ['Workplace', 'Attendance', 'Supervisor feedback', 'System'].includes(body.category)
        ? body.category
        : 'Workplace'
      const audience =
        category === 'System'
          ? 'Administrator'
          : user.role === 'intern'
            ? 'Company Supervisor'
            : user.role === 'companySupervisor'
              ? 'University Supervisor'
              : 'Administrator'
      const complaint = {
        audience,
        category,
        id: `CMP-${Math.floor(1000 + Math.random() * 9000)}`,
        latestComment: body.comment ?? body.latestComment ?? 'Waiting for review.',
        priority: body.priority ?? 'Medium',
        status: 'Open',
        submittedAt: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
        submittedBy: user.name,
        title,
      }
      store.complaints.unshift(complaint)
      await saveData()
      await audit('complaint.created', user, { audience, category, complaintId: complaint.id })
      json(res, 201, { complaint })
      return
    }

    const complaintResolveMatch = pathMatch(url.pathname, /^\/api\/complaints\/([^/]+)\/resolve$/)
    if (req.method === 'PATCH' && complaintResolveMatch) {
      const user = requireUser(req, res)
      if (!user) return
      const complaint = store.complaints.find((item) => item.id === decodeURIComponent(complaintResolveMatch[1]))
      if (!complaint) {
        json(res, 404, { error: 'Complaint not found' })
        return
      }
      if (!complaintsForViewer(user).some((item) => item.id === complaint.id) || user.role === 'intern') {
        json(res, 403, { error: 'You do not have permission to resolve this complaint.' })
        return
      }
      complaint.latestComment = 'Issue resolved from notification center.'
      complaint.status = 'Resolved'
      await saveData()
      await audit('complaint.resolved', user, { complaintId: complaint.id })
      json(res, 200, { complaint })
      return
    }

    const complaintCommentMatch = pathMatch(url.pathname, /^\/api\/complaints\/([^/]+)\/comments$/)
    if (req.method === 'POST' && complaintCommentMatch) {
      const user = requireUser(req, res)
      if (!user) return
      const body = await readBody(req)
      const complaint = store.complaints.find((item) => item.id === decodeURIComponent(complaintCommentMatch[1]))
      if (!complaint) {
        json(res, 404, { error: 'Complaint not found' })
        return
      }
      if (!complaintsForViewer(user).some((item) => item.id === complaint.id)) {
        json(res, 403, { error: 'You do not have permission to comment on this complaint.' })
        return
      }
      complaint.latestComment = body.comment ?? 'Supervisor added a response comment.'
      complaint.status = complaint.status === 'Open' ? 'In review' : complaint.status
      await saveData()
      await audit('complaint.commented', user, { complaintId: complaint.id })
      json(res, 200, { complaint })
      return
    }

    const documentDownloadMatch = pathMatch(url.pathname, /^\/api\/documents\/([^/]+)\/download$/)
    if (req.method === 'GET' && documentDownloadMatch) {
      const user = requireUser(req, res)
      if (!user) return
      const documentRecord = store.documents.find((item) => item.id === decodeURIComponent(documentDownloadMatch[1]))
      if (!documentRecord || !documentsForViewer(user).some((item) => item.id === documentRecord.id)) {
        json(res, 404, { error: 'Document not found' })
        return
      }
      try {
        const bytes = await readFile(documentRecord.storagePath)
        documentRecord.downloads = Number(documentRecord.downloads ?? 0) + 1
        await saveData()
        await audit('document.downloaded', user, { documentId: documentRecord.id, title: documentRecord.title })
        res.writeHead(200, {
          'Access-Control-Allow-Origin': appOrigin,
          'Content-Disposition': `attachment; filename="${documentRecord.fileName}"`,
          'Content-Length': bytes.length,
          'Content-Type': documentRecord.mimeType ?? 'application/octet-stream',
        })
        res.end(bytes)
      } catch {
        json(res, 404, { error: 'Stored document file is missing' })
      }
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/documents') {
      const user = requireUser(req, res)
      if (!user) return
      const { items, pagination } = paginate(documentsForViewer(user), url, [
        'title',
        'uploadedBy',
        'audience',
        'fileType',
      ])
      json(res, 200, { documents: items.map(({ storagePath, ...documentRecord }) => documentRecord), pagination })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/documents') {
      const user = requireUser(req, res, ['admin', 'companySupervisor', 'universitySupervisor'])
      if (!user) return
      const body = await readBody(req)
      const upload = validateDocumentUpload(body)
      if (upload.error) {
        json(res, 422, { error: upload.error })
        return
      }
      await mkdir(uploadDirectory, { recursive: true })
      const id = `DOC-${Date.now()}`
      const safeFileName = `${id}-${upload.fileName.replace(/[^a-z0-9._-]/gi, '_')}`
      const storagePath = join(uploadDirectoryPath, safeFileName)
      await writeFile(storagePath, upload.bytes)
      const documentRecord = {
        audience: body.audience ?? 'All interns',
        downloads: Number(body.downloads ?? 0),
        fileName: upload.fileName,
        fileType: upload.fileType,
        id,
        mimeType: upload.mimeType,
        scanStatus: 'basic-validation-passed',
        size: `${Math.max(1, Math.round(upload.bytes.length / 1024))} KB`,
        storagePath,
        title: String(body.title ?? upload.fileName.replace(/\.[^.]+$/, '')).trim() || upload.fileName,
        uploadedAt: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
        uploadedBy: user.name,
      }
      store.documents.unshift(documentRecord)
      await saveData()
      await audit('document.uploaded', user, { documentId: id, fileName: upload.fileName, fileType: upload.fileType })
      const { storagePath: _storagePath, ...safeDocument } = documentRecord
      json(res, 201, { document: safeDocument })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/attendance-events') {
      const user = requireUser(req, res)
      if (!user) return
      const { items, pagination } = paginate(attendanceEventsForViewer(user), url, [
        'internName',
        'studentNo',
        'company',
        'university',
        'status',
        'type',
      ])
      json(res, 200, { events: items, pagination })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/attendance/check-in') {
      const user = requireUser(req, res, ['intern'])
      if (!user) return
      const body = await readBody(req)
      const studentNo = user.loginId
      const placement = placementsWithApprovedInterns().find((item) => sameCredential(item.studentNo, studentNo))
      const assignedCompanySite = siteForPlacement(placement)

      if (!placement || !assignedCompanySite) {
        json(res, 422, {
          accepted: false,
          error: placement
            ? `Company coordinates are not configured for ${placement.company}. Ask the administrator to update this placement.`
            : 'No active placement was found for this student number.',
          geofencePassed: false,
          policyMode: localTestingMode ? 'local-test' : 'strict',
          status: 'Rejected',
        })
        return
      }

      const gps = body.gps ?? null
      if (!gps || !Number.isFinite(Number(gps.latitude)) || !Number.isFinite(Number(gps.longitude))) {
        json(res, 422, {
          accepted: false,
          error: 'Live GPS coordinates are required before check-in.',
          geofencePassed: false,
          policyMode: localTestingMode ? 'local-test' : 'strict',
          status: 'Rejected',
        })
        return
      }
      const distance = distanceMeters(gps, assignedCompanySite)
      const geofencePassed = distance <= assignedCompanySite.radiusMeters
      const accepted = geofencePassed || localTestingMode
      const attendanceEvent = accepted
        ? createAttendanceEvent({
            companySite: assignedCompanySite,
            distance,
            geofencePassed,
            gps,
            placement,
            type: 'check-in',
          })
        : null
      if (attendanceEvent) {
        await saveData()
        await audit('attendance.checked_in', user, {
          distanceMeters: distance,
          geofencePassed,
          studentNo,
        })
      }
      json(res, accepted ? 201 : 403, {
        accepted,
        attendanceEvent,
        checkedInAt: new Date().toISOString(),
        companySite: assignedCompanySite,
        device: req.headers['user-agent'] ?? 'unknown',
        distanceMeters: distance,
        geofencePassed,
        gps,
        gpsAccuracyMeters: gps.accuracy,
        id: randomUUID(),
        policyMode: localTestingMode ? 'local-test' : 'strict',
        rejectionReason: accepted
          ? null
          : `Outside ${assignedCompanySite.name} radius: ${distance} m from site, allowed ${assignedCompanySite.radiusMeters} m.`,
        status: accepted ? 'Working' : 'Rejected',
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/attendance/check-out') {
      const user = requireUser(req, res, ['intern'])
      if (!user) return
      const body = await readBody(req)
      const studentNo = user.loginId
      const placement = placementsWithApprovedInterns().find((item) => sameCredential(item.studentNo, studentNo))
      const assignedCompanySite = siteForPlacement(placement)

      if (!placement || !assignedCompanySite) {
        json(res, 422, {
          error: placement
            ? `Company coordinates are not configured for ${placement.company}. Ask the administrator to update this placement.`
            : 'No active placement was found for this student number.',
          status: 'Rejected',
        })
        return
      }

      const gps = body.gps ?? null
      if (!gps || !Number.isFinite(Number(gps.latitude)) || !Number.isFinite(Number(gps.longitude))) {
        json(res, 422, {
          error: 'Live GPS coordinates are required before check-out.',
          status: 'Rejected',
        })
        return
      }
      const distance = gps ? distanceMeters(gps, assignedCompanySite) : null
      const geofencePassed = typeof distance === 'number' ? distance <= assignedCompanySite.radiusMeters : true
      if (!localTestingMode && gps && !geofencePassed) {
        json(res, 403, {
          error: `Outside ${assignedCompanySite.name} radius: ${distance} m from site, allowed ${assignedCompanySite.radiusMeters} m.`,
          geofencePassed,
          status: 'Rejected',
        })
        return
      }
      const attendanceEvent = createAttendanceEvent({
        companySite: assignedCompanySite,
        distance,
        geofencePassed,
        gps,
        placement,
        type: 'check-out',
      })
      await saveData()
      await audit('attendance.checked_out', user, {
        distanceMeters: distance,
        geofencePassed,
        studentNo,
      })
      json(res, 200, {
        attendanceEvent,
        checkedOutAt: new Date().toISOString(),
        durationMinutes: 502,
        id: randomUUID(),
        status: 'Checked out',
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/reports') {
      const user = requireUser(req, res)
      if (!user) return
      const { items, pagination } = paginate(reportsForViewer(user), url, [
        'title',
        'owner',
        'studentNo',
        'company',
        'university',
        'status',
        'reviewer',
      ])
      json(res, 200, { reports: items, pagination })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/reports') {
      const user = requireUser(req, res, ['intern'])
      if (!user) return
      const body = await readBody(req)
      const report = createReportRecord(body, user)

      if (!report) {
        json(res, 422, {
          error: 'Student name, student number, company, university, period start, and period end are required.',
        })
        return
      }
      if (report.error) {
        json(res, 422, { error: report.error })
        return
      }

      store.reports.unshift(report)
      await saveData()
      await audit('report.submitted', user, { reportId: report.id, studentNo: report.studentNo })
      json(res, 201, { report })
      return
    }

    const reportApproveMatch = pathMatch(url.pathname, /^\/api\/reports\/([^/]+)\/approve$/)
    if (req.method === 'PATCH' && reportApproveMatch) {
      const user = requireUser(req, res, ['admin', 'companySupervisor', 'universitySupervisor'])
      if (!user) return
      const report = store.reports.find((item) => item.id === decodeURIComponent(reportApproveMatch[1]))

      if (!report) {
        json(res, 404, { error: 'Report not found' })
        return
      }

      if (!canManageReport(user, report)) {
        json(res, 403, { error: 'You are not assigned to approve this report.' })
        return
      }

      if (user.role === 'companySupervisor' || (user.role === 'admin' && report.status === 'Pending company approval')) {
        if (report.status !== 'Pending company approval') {
          json(res, 409, { error: 'This report is not waiting for company supervisor approval.' })
          return
        }

        report.companyApprovedAt = new Date().toLocaleString()
        report.companyApprovedBy = user.name
        report.reviewer = 'University Supervisor'
        report.status = 'Pending university approval'
        await saveData()
        await audit('report.company_approved', user, { reportId: report.id, studentNo: report.studentNo })
        json(res, 200, { report })
        return
      }

      if (user.role === 'universitySupervisor' || (user.role === 'admin' && report.status === 'Pending university approval')) {
        if (report.status !== 'Pending university approval') {
          json(res, 409, { error: 'This report has not been approved by the company supervisor yet.' })
          return
        }

        report.reviewer = user.name
        report.status = 'Approved'
        report.universityApprovedAt = new Date().toLocaleString()
        report.universityApprovedBy = user.name
        await saveData()
        await audit('report.university_approved', user, { reportId: report.id, studentNo: report.studentNo })
        json(res, 200, { report })
        return
      }

      json(res, 403, { error: 'Only company and university supervisors can approve reports.' })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/reports/export') {
      const user = requireUser(req, res)
      if (!user) return
      await audit('report.export_requested', user, { format: url.searchParams.get('format') ?? 'pdf' })
      json(res, 200, {
        downloadUrl: '/exports/reports',
        exportId: randomUUID(),
        format: url.searchParams.get('format') ?? 'pdf',
        status: 'queued',
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/backup') {
      const user = requireUser(req, res, ['admin'])
      if (!user) return
      await audit('backup.created', user, storeCounts())
      json(res, 200, createBackupPayload())
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/restore') {
      const user = requireUser(req, res, ['admin'])
      if (!user) return
      const body = await readBody(req)
      const restoredData = body.backup?.data ?? body.data ?? body.backup ?? body
      const restoredStore = mergeData(restoredData)
      store = restoredStore
      await migrateStoredSecrets()
      await audit('backup.restored', user, storeCounts())
      json(res, 200, { counts: storeCounts(), restoredAt: new Date().toISOString() })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/cleanup-stale') {
      const user = requireUser(req, res, ['admin'])
      if (!user) return
      json(res, 200, cleanupPreview())
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/cleanup-stale') {
      const user = requireUser(req, res, ['admin'])
      if (!user) return
      const body = await readBody(req)
      if (body.apply !== true) {
        json(res, 200, cleanupPreview())
        return
      }
      json(res, 200, await applyCleanup(user))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/password-reset') {
      const user = requireUser(req, res, ['admin'])
      if (!user) return
      const body = await readBody(req)
      const credential = String(body.credential ?? body.loginId ?? body.email ?? '').trim()
      const generatedPassword = `IC-${randomUUID().slice(0, 8)}-${Math.floor(100 + Math.random() * 900)}`
      const newPassword = String(body.newPassword || generatedPassword)
      if (!credential) {
        json(res, 422, { error: 'User email or assigned ID is required.' })
        return
      }
      if (newPassword.length < 8) {
        json(res, 422, { error: 'New password must be at least 8 characters.' })
        return
      }
      const bootstrapAccount = bootstrapAccounts.find(
        (account) => sameCredential(account.loginId, credential) || sameCredential(account.email, credential),
      )
      if (bootstrapAccount) {
        json(res, 409, { error: 'Bootstrap admin password is controlled by BOOTSTRAP_ADMIN_PASSWORD in the environment.' })
        return
      }
      const account = store.approvedAccounts.find(
        (item) => sameCredential(item.loginId, credential) || sameCredential(item.email, credential),
      )
      if (!account) {
        json(res, 404, { error: 'Approved account not found.' })
        return
      }
      account.passwordHash = await hashPassword(newPassword)
      delete account.password
      store.accountRequests
        .filter((request) => sameCredential(request.loginId, account.loginId) || sameCredential(request.email, account.email))
        .forEach((request) => {
          request.passwordHash = account.passwordHash
          delete request.password
        })
      await saveData()
      await audit('account.password_reset', user, { targetLoginId: account.loginId, targetRole: account.role })
      json(res, 200, {
        account: sanitizeAccount(account),
        temporaryPassword: body.newPassword ? null : newPassword,
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/audit-logs') {
      const user = requireUser(req, res, ['admin'])
      if (!user) return
      const { items, pagination } = paginate(store.auditLogs, url, [
        'action',
        'actorEmail',
        'actorLoginId',
        'actorName',
        'actorRole',
      ])
      json(res, 200, { auditLogs: items, pagination })
      return
    }

    json(res, 404, { error: 'Route not found' })
  } catch (error) {
    json(res, 400, { error: error instanceof Error ? error.message : 'Request failed' })
  }
})

server.listen(port, () => {
  console.log(`Intern Nexus API running at http://127.0.0.1:${port}`)
})
