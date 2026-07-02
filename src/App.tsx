import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, Dispatch, FormEvent, KeyboardEvent, ReactNode, SetStateAction } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Building2,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Home,
  KeyRound,
  LogOut,
  LineChart,
  LockKeyhole,
  Mail,
  MapPin,
  MessageSquare,
  Moon,
  Paperclip,
  Plus,
  QrCode,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  UploadCloud,
  UserCheck,
  UsersRound,
  Wifi,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  accessLevels,
  companies,
  permissions,
  roles,
} from './data/mockData'
import type {
  AccessLevelRecord,
  ActivityLog,
  AttendanceRecord,
  ComplaintRecord,
  DocumentRecord,
  InternRecord,
  Metric,
  RankingRecord,
  ReportRecord,
  RoleId,
  StatusTone,
  TaskRecord,
  TrendPoint,
} from './types'

type ViewKey =
  | 'overview'
  | 'attendance'
  | 'tasks'
  | 'reports'
  | 'analytics'
  | 'evaluations'
  | 'complaints'
  | 'documents'
  | 'rankings'
  | 'notifications'
  | 'access'
  | 'directory'
  | 'security'

interface NavItem {
  key: ViewKey
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { key: 'overview', label: 'Overview', icon: Home },
  { key: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { key: 'tasks', label: 'Tasks', icon: ClipboardList },
  { key: 'reports', label: 'Reports', icon: FileSpreadsheet },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'evaluations', label: 'Evaluations', icon: UserCheck },
  { key: 'complaints', label: 'Complaints', icon: MessageSquare },
  { key: 'documents', label: 'Documents', icon: UploadCloud },
  { key: 'rankings', label: 'Rankings', icon: BarChart3 },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'access', label: 'Access Levels', icon: ShieldCheck },
  { key: 'directory', label: 'Directory', icon: Building2 },
  { key: 'security', label: 'Security', icon: ShieldCheck },
]

const viewAccess: Record<ViewKey, RoleId[]> = {
  overview: ['admin', 'intern', 'companySupervisor', 'universitySupervisor'],
  attendance: ['admin', 'intern', 'companySupervisor', 'universitySupervisor'],
  tasks: ['admin', 'intern', 'companySupervisor'],
  reports: ['admin', 'intern', 'companySupervisor', 'universitySupervisor'],
  analytics: ['admin', 'companySupervisor', 'universitySupervisor'],
  evaluations: ['admin', 'intern', 'companySupervisor', 'universitySupervisor'],
  complaints: ['admin', 'intern', 'companySupervisor', 'universitySupervisor'],
  documents: ['admin', 'intern', 'companySupervisor', 'universitySupervisor'],
  rankings: ['admin', 'intern', 'universitySupervisor'],
  notifications: ['admin', 'intern', 'companySupervisor', 'universitySupervisor'],
  access: ['admin'],
  directory: ['admin', 'companySupervisor', 'universitySupervisor'],
  security: ['admin'],
}

const canAccessView = (view: ViewKey, role: RoleId) => role === 'admin' || viewAccess[view].includes(role)
const logoSrc = '/intern-nexus-logo.jpeg'

interface AppAccount {
  email: string
  loginId: string
  loginLabel: string
  name: string
  organization: string
  role: RoleId
}

type AccountRequestStatus = 'Pending' | 'Approved' | 'Rejected'

interface AccountRequest {
  email: string
  id: string
  loginId: string
  loginLabel: string
  name: string
  note: string
  organization: string
  requestedAt: string
  reviewedAt?: string
  role: RoleId
  status: AccountRequestStatus
}

interface AccountRequestForm {
  email: string
  loginId: string
  name: string
  note: string
  organization: string
  password: string
  role: RoleId
}

interface AnnouncementRecord {
  audience: string
  author: string
  createdAt: string
  id: string
  message: string
  title: string
}

interface AnnouncementDraft {
  audience: string
  message: string
  title: string
}

interface AttendanceEventRecord {
  audience: 'University Supervisor'
  category: 'Attendance'
  company: string
  distanceMeters: number | null
  geofencePassed: boolean
  gpsAccuracyMeters: number | null
  id: string
  internName: string
  message: string
  occurredAt: string
  status: 'Working' | 'Checked out'
  studentNo: string
  title: string
  type: 'check-in' | 'check-out'
  university: string
}

interface NotificationItem {
  actionLabel?: string
  category: string
  description: string
  id: string
  onAction?: () => void
  onSecondaryAction?: () => void
  secondaryActionLabel?: string
  time: string
  title: string
  tone: StatusTone
}

interface AdminAuditLog {
  action: string
  actorName: string
  actorRole: string
  id: string
  occurredAt: string
}

interface CleanupCandidate {
  collection: string
  itemId: string
  label: string
  reason: string
}

interface CleanupPreview {
  candidates: CleanupCandidate[]
  summary: Record<string, number>
}

interface LoginSession {
  accessToken: string
  email: string
  expiresAt: number
  level: number
  loginId: string
  name: string
  organization: string
  role: RoleId
}

const sessionStorageKey = 'internconnect-session'
const approvedAccountsStorageKey = 'internconnect-approved-accounts'
const accountRequestsStorageKey = 'internconnect-account-requests'
const announcementsStorageKey = 'internconnect-announcements'
const attendanceEventsStorageKey = 'internconnect-attendance-events'
const placementsStorageKey = 'internconnect-placements'

const loginLabelsByRole: Record<RoleId, string> = {
  admin: 'Admin staff ID',
  companySupervisor: 'Company staff ID',
  intern: 'Student number',
  universitySupervisor: 'University staff ID',
}

const defaultAccountRequestForm: AccountRequestForm = {
  email: '',
  loginId: '',
  name: '',
  note: '',
  organization: '',
  password: '',
  role: 'intern',
}

const defaultAnnouncementDraft: AnnouncementDraft = {
  audience: 'All users',
  message: '',
  title: '',
}

const bootstrapAccounts: AppAccount[] = [
  {
    email: 'admin@internnexus.local',
    loginId: 'ADM-001',
    loginLabel: 'Admin staff ID',
    name: 'System Administrator',
    organization: 'Intern Nexus HQ',
    role: 'admin',
  },
]

function readStoredArray<T>(key: string): T[] {
  try {
    const rawValue = localStorage.getItem(key)
    if (!rawValue) return []

    const parsedValue = JSON.parse(rawValue)
    return Array.isArray(parsedValue) ? (parsedValue as T[]) : []
  } catch {
    return []
  }
}

const writeStoredArray = <T,>(key: string, value: T[]) => {
  localStorage.setItem(key, JSON.stringify(value))
}

const removedSamplePlacementStudentNumbers = new Set(['ICT/2023/018', 'BIS/2023/044', 'CS/2023/102', 'SE/2023/087'])

const readApprovedAccounts = () => readStoredArray<AppAccount>(approvedAccountsStorageKey)
const readAccountRequests = () => readStoredArray<AccountRequest>(accountRequestsStorageKey)
const readAnnouncements = () => readStoredArray<AnnouncementRecord>(announcementsStorageKey)
const readAttendanceEvents = () => readStoredArray<AttendanceEventRecord>(attendanceEventsStorageKey)
const readPlacements = () =>
  readStoredArray<InternRecord>(placementsStorageKey).filter(
    (placement) => !removedSamplePlacementStudentNumbers.has(placement.studentNo),
  )
const sameCredential = (left: string, right: string) => left.trim().toLowerCase() === right.trim().toLowerCase()
const normalizePersonName = (value: string) => value.trim().toLowerCase().split(/\s+/).sort().join(' ')
const samePersonName = (left: string, right: string) => normalizePersonName(left) === normalizePersonName(right)

const downloadTextFile = (filename: string, content: string, type = 'text/plain') => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the selected file'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.readAsDataURL(file)
  })

const createSession = (account: AppAccount, accessToken: string, expiresIn: number): LoginSession => {
  const level = accessLevels.find((item) => item.role === account.role)?.level ?? 4

  return {
    accessToken,
    email: account.email,
    expiresAt: Date.now() + expiresIn * 1000,
    level,
    loginId: account.loginId,
    name: account.name,
    organization: account.organization,
    role: account.role,
  }
}

const readStoredSession = () => {
  try {
    const rawSession = localStorage.getItem(sessionStorageKey)
    if (!rawSession) return null

    const session = JSON.parse(rawSession) as LoginSession
    if (!session.accessToken || !session.expiresAt || Date.now() > session.expiresAt) return null
    return session
  } catch {
    return null
  }
}

const metricIcons: LucideIcon[] = [
  UsersRound,
  CheckCircle2,
  Clock,
  Activity,
]

const placementStatusOptions: InternRecord['status'][] = ['Active', 'Late', 'Needs review', 'On leave']

interface CompanySite {
  address?: string | null
  latitude: number
  longitude: number
  name: string
  radiusMeters: number
}

interface CompanyGeocodeResult {
  address: string
  latitude: number
  longitude: number
  name: string
  radiusMeters: number
  source: string
}

const emptyPlacementForm: InternRecord = {
  attendance: 0,
  company: 'Unassigned company',
  companyAddress: null,
  companyLatitude: null,
  companyLongitude: null,
  department: '',
  name: '',
  performance: 0,
  radiusMeters: 150,
  status: 'Needs review',
  studentNo: '',
  supervisor: '',
  university: '',
}

const createPlacementFromAccount = (account: AppAccount): InternRecord => ({
  attendance: 0,
  company: 'Unassigned company',
  companyAddress: null,
  companyLatitude: null,
  companyLongitude: null,
  department: 'Awaiting department',
  name: account.name,
  performance: 0,
  radiusMeters: 150,
  status: 'Needs review',
  studentNo: account.loginId,
  supervisor: 'Awaiting supervisor',
  university: account.organization,
})

const mergeAccountPlacements = (placements: InternRecord[], accounts: AppAccount[]) => {
  const nextPlacements = [...placements]

  accounts
    .filter((account) => account.role === 'intern')
    .forEach((account) => {
      const exists = nextPlacements.some((placement) => sameCredential(placement.studentNo, account.loginId))
      if (!exists) {
        nextPlacements.push(createPlacementFromAccount(account))
      }
    })

  return nextPlacements
}

const companyLocationFor = (companyName: string) =>
  companies.find((company) => company.name.toLowerCase() === companyName.toLowerCase())?.location ?? 'Not assigned'

const companySiteForName = (companyName: string): CompanySite | null => {
  const company = companies.find((item) => item.name.toLowerCase() === companyName.toLowerCase())
  if (!company) return null

  return {
    address: company.location,
    latitude: company.latitude,
    longitude: company.longitude,
    name: company.name,
    radiusMeters: company.radiusMeters,
  }
}

const companySiteForPlacement = (placement?: InternRecord | null): CompanySite | null => {
  if (!placement) return null
  const latitude = typeof placement.companyLatitude === 'number' ? placement.companyLatitude : null
  const longitude = typeof placement.companyLongitude === 'number' ? placement.companyLongitude : null

  if (latitude !== null && longitude !== null) {
    return {
      address: placement.companyAddress ?? null,
      latitude,
      longitude,
      name: placement.company,
      radiusMeters: placement.radiusMeters ?? 150,
    }
  }

  return companySiteForName(placement.company)
}

const formatCoordinates = (site?: CompanySite | null) =>
  site ? `${site.latitude.toFixed(6)}, ${site.longitude.toFixed(6)}` : 'Coordinates not configured'

const companyLocationForPlacement = (placement: InternRecord) =>
  placement.companyAddress || companyLocationFor(placement.company)

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`

const roleAccent: Record<RoleId, string> = {
  admin: 'System authority',
  intern: 'Personal workspace',
  companySupervisor: 'Company command center',
  universitySupervisor: 'Academic supervision',
}

const rolePanels: Record<RoleId, { title: string; items: string[] }> = {
  admin: {
    title: 'Admin control room',
    items: [
      'Register interns, supervisors, companies, universities, and internship periods.',
      'Assign interns across company and university supervisors with RBAC enforcement.',
      'Access every dashboard, complaint, document, report, ranking, export, and audit trail.',
    ],
  },
  intern: {
    title: 'Intern daily flow',
    items: [
      'Check in with GPS and QR validation, then upload daily work evidence.',
      'Submit structured daily reports for supervisor review.',
      'Submit complaints, read supervisor comments, download documents, and compare ranking progress.',
    ],
  },
  companySupervisor: {
    title: 'Company supervision queue',
    items: [
      'Monitor attendance, review daily reports, assign tasks, and validate completed work.',
      'Spot missing interns, late arrivals, overdue work, and pending daily reports.',
      'Handle assigned complaints, add comments, and upload DOCX guidance for assigned interns.',
    ],
  },
  universitySupervisor: {
    title: 'University oversight',
    items: [
      'Monitor assigned students, company placements, attendance summaries, and report quality.',
      'Review academic reports, monitor attendance, and download submitted evidence.',
      'Review complaints, upload academic documents, and compare internship rankings across companies.',
    ],
  },
}

const statusTone = (status: string): StatusTone => {
  if (['Present', 'Checked out', 'Completed', 'Approved', 'Active', 'Working', 'Resolved', 'Low'].includes(status)) {
    return 'green'
  }

  if (
    [
      'Late',
      'Pending',
      'Pending review',
      'Pending company approval',
      'In Progress',
      'In review',
      'Medium',
      'Open',
      'Submitted',
      'Waiting approval',
    ].includes(status)
  ) {
    return 'amber'
  }

  if (['Pending university approval'].includes(status)) {
    return 'blue'
  }

  if (
    ['Overdue', 'Rejected', 'Absent', 'Needs review', 'Needs correction', 'Corrections requested', 'Escalated', 'High'].includes(
      status,
    )
  ) {
    return 'red'
  }

  return 'slate'
}

const fallbackCompanySite: CompanySite = {
  name: 'Workplace not configured',
  latitude: 0.3476,
  longitude: 32.5825,
  radiusMeters: 150,
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:4500'

const readAccessToken = () => {
  try {
    const session = JSON.parse(localStorage.getItem(sessionStorageKey) ?? 'null') as LoginSession | null
    if (!session?.accessToken || Date.now() > session.expiresAt) return null
    return session.accessToken
  } catch {
    return null
  }
}

const apiJson = async <T,>(path: string, options: RequestInit = {}) => {
  const token = readAccessToken()
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const payload = (await response.json()) as T & { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? 'API request failed')
  }

  return payload
}

type GeoStatus = 'idle' | 'watching' | 'ready' | 'blocked' | 'unsupported'

interface LiveLocation {
  accuracy: number
  distanceMeters: number
  geofencePassed: boolean
  latitude: number
  longitude: number
  updatedAt: string
}

interface GeoState {
  error?: string
  location?: LiveLocation
  status: GeoStatus
}

interface AttendanceCheckInResult {
  accepted: boolean
  attendanceEvent?: AttendanceEventRecord | null
  distanceMeters: number
  geofencePassed: boolean
  policyMode: 'strict' | 'local-test'
  rejectionReason?: string | null
  status: 'Working' | 'Rejected'
}

const toRadians = (value: number) => (value * Math.PI) / 180

const calculateDistanceMeters = (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
) => {
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

const formatMeters = (value?: number | null) => {
  if (typeof value !== 'number') return 'Waiting for GPS'

  return value >= 1000 ? `${(value / 1000).toFixed(2)} km` : `${value} m`
}

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

const parseStoredDate = (value?: string | null) => {
  const dateText = String(value ?? '').trim()
  const dayFirstMatch = dateText.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i,
  )

  if (dayFirstMatch) {
    const [, day, month, year, hour = '0', minute = '0', second = '0', meridiem] = dayFirstMatch
    let parsedHour = Number(hour)
    if (meridiem?.toUpperCase() === 'PM' && parsedHour < 12) parsedHour += 12
    if (meridiem?.toUpperCase() === 'AM' && parsedHour === 12) parsedHour = 0

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      parsedHour,
      Number(minute),
      Number(second),
    )
  }

  const parsed = Date.parse(dateText)
  return Number.isFinite(parsed) ? new Date(parsed) : new Date()
}

const localDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const formatHours = (hours: number) => {
  if (hours <= 0) return '0h'
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)

  if (wholeHours === 0) return `${minutes}m`
  return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`
}

const taskBelongsToSession = (task: TaskRecord, session: LoginSession) =>
  sameCredential(task.studentNo ?? '', session.loginId) ||
  sameCredential(task.intern ?? '', session.name) ||
  sameCredential(task.intern ?? '', session.loginId)

const taskBelongsToPlacement = (task: TaskRecord, placement: InternRecord) =>
  sameCredential(task.studentNo ?? '', placement.studentNo) ||
  samePersonName(task.intern ?? '', placement.name)

const taskAwaitingCompanyApproval = (task: TaskRecord) =>
  task.status === 'Submitted' ||
  (Boolean(task.submittedAt) && !task.reviewedAt && ['In Progress', 'Overdue'].includes(task.status))

const taskBoardStatus = (task: TaskRecord): TaskRecord['status'] => {
  if (taskAwaitingCompanyApproval(task)) return 'In Progress'
  if (task.status === 'Needs correction') return 'Rejected'
  return task.status
}

const evaluationBelongsToSession = (evaluation: ManualEvaluationRecord, session: LoginSession) =>
  sameCredential(evaluation.studentNo, session.loginId) || samePersonName(evaluation.internName, session.name)

const calculateAttendanceStats = (events: AttendanceEventRecord[], now = new Date()) => {
  const sortedEvents = [...events].sort(
    (left, right) => parseStoredDate(left.occurredAt).getTime() - parseStoredDate(right.occurredAt).getTime(),
  )
  const activeDays = new Set<string>()
  const checkInDays = new Set<string>()
  const todayKey = localDateKey(now)
  let openCheckIn: Date | null = null
  let totalMs = 0
  let checkedInNow = false

  for (const event of sortedEvents) {
    const eventDate = parseStoredDate(event.occurredAt)
    const eventKey = localDateKey(eventDate)
    activeDays.add(eventKey)

    if (event.type === 'check-in') {
      checkInDays.add(eventKey)
      openCheckIn = eventDate
      checkedInNow = true
      continue
    }

    if (openCheckIn) {
      totalMs += Math.max(0, eventDate.getTime() - openCheckIn.getTime())
      openCheckIn = null
    }
    checkedInNow = false
  }

  if (openCheckIn && localDateKey(openCheckIn) === todayKey) {
    totalMs += Math.max(0, now.getTime() - openCheckIn.getTime())
  }

  const hoursLogged = totalMs / 3_600_000
  const attendanceRate =
    checkInDays.size > 0 ? clampPercent((checkInDays.size / Math.max(checkInDays.size, activeDays.size)) * 100) : 0

  return {
    attendanceRate,
    checkedInNow,
    checkInDays: checkInDays.size,
    hoursLabel: formatHours(hoursLogged),
    hoursLogged,
    latestEvent: sortedEvents.at(-1) ?? null,
    todayCheckedIn: checkInDays.has(todayKey),
  }
}

const sortAttendanceEvents = (events: AttendanceEventRecord[]) =>
  [...events].sort(
    (left, right) => parseStoredDate(right.occurredAt).getTime() - parseStoredDate(left.occurredAt).getTime(),
  )

const mergeAttendanceEvents = (
  backendEvents: AttendanceEventRecord[],
  currentEvents: AttendanceEventRecord[],
) => {
  const eventsById = new Map<string, AttendanceEventRecord>()

  currentEvents
    .filter((event) => event.id.startsWith('ATT-LOCAL-'))
    .forEach((event) => {
      eventsById.set(event.id, event)
    })
  backendEvents.forEach((event) => {
    eventsById.set(event.id, event)
  })

  return sortAttendanceEvents(Array.from(eventsById.values())).slice(0, 100)
}

const calculateEvaluationScore = (evaluations: ManualEvaluationRecord[]) => {
  if (evaluations.length === 0) return 0

  return clampPercent(
    evaluations.reduce((sum, evaluation) => sum + Number(evaluation.overallScore ?? 0), 0) / evaluations.length,
  )
}

const calculateTaskCompletionRate = (tasks: TaskRecord[]) =>
  tasks.length > 0 ? clampPercent((tasks.filter((task) => task.status === 'Completed').length / tasks.length) * 100) : 0

const buildProgramTrend = (
  attendanceEvents: AttendanceEventRecord[],
  taskItems: TaskRecord[],
  reportItems: ReportRecord[],
  placementItems: InternRecord[],
): TrendPoint[] => {
  const dates = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (5 - index))
    return date
  })
  const assignedInternCount = Math.max(1, placementItems.length)
  const taskCompletion = calculateTaskCompletionRate(taskItems)
  const reportCompletion =
    reportItems.length > 0
      ? clampPercent((reportItems.filter((report) => report.status === 'Approved').length / reportItems.length) * 100)
      : 0

  return dates.map((date) => {
    const key = localDateKey(date)
    const dayEvents = attendanceEvents.filter((event) => localDateKey(parseStoredDate(event.occurredAt)) === key)
    const checkedInInterns = new Set(
      dayEvents.filter((event) => event.type === 'check-in').map((event) => event.studentNo || event.internName),
    )
    const geofenceEvents = dayEvents.filter((event) => event.type === 'check-in')
    const punctuality =
      geofenceEvents.length > 0
        ? clampPercent((geofenceEvents.filter((event) => event.geofencePassed).length / geofenceEvents.length) * 100)
        : 0

    return {
      attendance: clampPercent((checkedInInterns.size / assignedInternCount) * 100),
      label: date.toLocaleDateString([], { weekday: 'short' }),
      punctuality,
      reports: reportCompletion,
      tasks: taskCompletion,
    }
  })
}

const buildDepartmentStats = (placements: InternRecord[], tasks: TaskRecord[]) => {
  const departments = Array.from(new Set(placements.map((placement) => placement.department || 'General'))).slice(0, 6)
  const sourceDepartments = departments.length > 0 ? departments : ['General']

  return sourceDepartments.map((department) => {
    const departmentPlacements = placements.filter((placement) => (placement.department || 'General') === department)
    const departmentTasks = tasks.filter((task) =>
      departmentPlacements.some((placement) => taskBelongsToPlacement(task, placement)),
    )

    return {
      completion: calculateTaskCompletionRate(departmentTasks),
      department,
      interns: departmentPlacements.length,
    }
  })
}

const buildTaskMix = (tasks: TaskRecord[]) => [
  { color: '#2f9e73', name: 'Completed', value: tasks.filter((task) => task.status === 'Completed').length },
  { color: '#2f6fbb', name: 'In progress', value: tasks.filter((task) => taskBoardStatus(task) === 'In Progress').length },
  { color: '#d89a25', name: 'Pending', value: tasks.filter((task) => task.status === 'Pending').length },
  { color: '#d9534f', name: 'Overdue', value: tasks.filter((task) => task.status === 'Overdue').length },
]

const buildInsights = (
  attendanceStats: ReturnType<typeof calculateAttendanceStats>,
  taskItems: TaskRecord[],
  reportItems: ReportRecord[],
  evaluationScore: number,
) => {
  const insights = [
    attendanceStats.todayCheckedIn
      ? `Attendance is active today. Logged time is now ${attendanceStats.hoursLabel}.`
      : 'No check-in has been recorded today.',
    `${taskItems.filter((task) => task.status !== 'Completed').length} task(s) still need action.`,
    `${reportItems.filter((report) => report.status !== 'Approved').length} report(s) are still in the approval workflow.`,
    evaluationScore > 0 ? `Latest evaluation average is ${evaluationScore}%.` : 'No supervisor evaluation has been submitted yet.',
  ]

  return insights.slice(0, 4)
}

function App() {
  const [session, setSession] = useState<LoginSession | null>(() => readStoredSession())
  const [approvedAccounts, setApprovedAccounts] = useState<AppAccount[]>(() => readApprovedAccounts())
  const [accountRequests, setAccountRequests] = useState<AccountRequest[]>(() => readAccountRequests())
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>(() => readAnnouncements())
  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceEventRecord[]>(() => readAttendanceEvents())
  const [announcementComposerOpen, setAnnouncementComposerOpen] = useState(false)
  const [announcementDraft, setAnnouncementDraft] = useState<AnnouncementDraft>(defaultAnnouncementDraft)
  const [complaintItems, setComplaintItems] = useState<ComplaintRecord[]>([])
  const [manualEvaluationItems, setManualEvaluationItems] = useState<ManualEvaluationRecord[]>([])
  const [reportItems, setReportItems] = useState<ReportRecord[]>([])
  const [taskItems, setTaskItems] = useState<TaskRecord[]>([])
  const [placementItems, setPlacementItems] = useState<InternRecord[]>(() => readPlacements())
  const [activeView, setActiveView] = useState<ViewKey>('overview')
  const [darkMode, setDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [checkedIn, setCheckedIn] = useState(false)
  const [toast, setToast] = useState('Real-time sync connected')
  const [liveTick, setLiveTick] = useState(0)

  const { data: systemHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => ({
      api: 'Online',
      realtime: 'Socket ready',
      latency: '42 ms',
      auditQueue: '14 events',
    }),
    refetchInterval: 12000,
  })
  const role = session?.role ?? 'intern'

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveTick((value) => (value + 1) % 60)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!toast) return

    const timer = window.setTimeout(() => {
      setToast('')
    }, 3200)

    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!canAccessView(activeView, role)) {
      setActiveView('overview')
    }
  }, [activeView, role])

  useEffect(() => {
    if (!session) return
    let ignored = false

    const loadBackendState = async (showOfflineToast = false) => {
      try {
        const [
          announcementsPayload,
          complaintsPayload,
          placementsPayload,
          attendanceEventsPayload,
          tasksPayload,
          reportsPayload,
          evaluationsPayload,
        ] = await Promise.all([
          apiJson<{ announcements: AnnouncementRecord[] }>('/api/announcements'),
          apiJson<{ complaints: ComplaintRecord[] }>('/api/complaints'),
          apiJson<{ placements: InternRecord[] }>('/api/placements'),
          apiJson<{ events: AttendanceEventRecord[] }>('/api/attendance-events'),
          apiJson<{ tasks: TaskRecord[] }>('/api/tasks'),
          apiJson<{ reports: ReportRecord[] }>('/api/reports'),
          apiJson<{ evaluations: ManualEvaluationRecord[] }>('/api/evaluations'),
        ])
        const accountsPayload =
          role === 'admin' ? await apiJson<{ accounts: AppAccount[] }>('/api/accounts/approved') : { accounts: [] }
        const requestsPayload =
          role === 'admin' ? await apiJson<{ requests: AccountRequest[] }>('/api/account-requests') : { requests: [] }

        if (ignored) return

        const nextPlacements = mergeAccountPlacements(placementsPayload.placements, accountsPayload.accounts)
        setApprovedAccounts(accountsPayload.accounts)
        writeStoredArray(approvedAccountsStorageKey, accountsPayload.accounts)
        setAccountRequests(requestsPayload.requests)
        writeStoredArray(accountRequestsStorageKey, requestsPayload.requests)
        setAnnouncements(announcementsPayload.announcements)
        writeStoredArray(announcementsStorageKey, announcementsPayload.announcements)
        setComplaintItems(complaintsPayload.complaints)
        setPlacementItems(nextPlacements)
        writeStoredArray(placementsStorageKey, nextPlacements)
        setAttendanceEvents((currentEvents) => {
          const nextEvents = mergeAttendanceEvents(attendanceEventsPayload.events, currentEvents)
          writeStoredArray(attendanceEventsStorageKey, nextEvents)
          return nextEvents
        })
        setTaskItems(tasksPayload.tasks)
        setReportItems(reportsPayload.reports)
        setManualEvaluationItems(evaluationsPayload.evaluations)
      } catch {
        if (!ignored && showOfflineToast) {
          triggerToast('Local API offline; using browser fallback data')
        }
      }
    }

    void loadBackendState(true)
    const refreshTimer = window.setInterval(() => {
      void loadBackendState(false)
    }, 5_000)

    return () => {
      ignored = true
      window.clearInterval(refreshTimer)
    }
  }, [role, session])

  const currentRole = roles.find((item) => item.id === role) ?? roles[0]
  const currentAccessLevel = accessLevels.find((item) => item.role === role) ?? accessLevels[0]
  const visibleNavItems = navItems.filter((item) => canAccessView(item.key, role))
  const allAccounts = useMemo(() => [...bootstrapAccounts, ...approvedAccounts], [approvedAccounts])
  const sessionLoginId = session?.loginId ?? ''
  const sessionName = session?.name ?? ''
  const sessionOrganization = session?.organization ?? ''
  const currentInternAttendanceEvents = useMemo(
    () =>
      attendanceEvents.filter(
        (event) =>
          sameCredential(event.studentNo ?? '', sessionLoginId) ||
          samePersonName(event.internName ?? '', sessionName),
      ),
    [attendanceEvents, sessionLoginId, sessionName],
  )
  const currentInternTasks = useMemo(
    () => (session ? taskItems.filter((task) => taskBelongsToSession(task, session)) : []),
    [session, taskItems],
  )
  const currentInternReports = useMemo(
    () =>
      reportItems.filter(
        (report) =>
          sameCredential(report.studentNo ?? '', sessionLoginId) ||
          samePersonName(report.owner ?? '', sessionName),
      ),
    [reportItems, sessionLoginId, sessionName],
  )
  const currentInternEvaluations = useMemo(
    () =>
      session
        ? manualEvaluationItems.filter((evaluation) => evaluationBelongsToSession(evaluation, session))
        : [],
    [manualEvaluationItems, session],
  )
  const currentAttendanceStats = useMemo(
    () => calculateAttendanceStats(role === 'intern' ? currentInternAttendanceEvents : attendanceEvents),
    [attendanceEvents, currentInternAttendanceEvents, liveTick, role],
  )
  const currentEvaluationScore = useMemo(
    () => calculateEvaluationScore(role === 'intern' ? currentInternEvaluations : manualEvaluationItems),
    [currentInternEvaluations, manualEvaluationItems, role],
  )
  const livePlacementItems = useMemo(
    () =>
      placementItems.map((placement) => {
        const placementEvents = attendanceEvents.filter(
          (event) =>
            sameCredential(event.studentNo ?? '', placement.studentNo) ||
            samePersonName(event.internName ?? '', placement.name),
        )
        const placementEvaluations = manualEvaluationItems.filter(
          (evaluation) =>
            sameCredential(evaluation.studentNo, placement.studentNo) ||
            samePersonName(evaluation.internName, placement.name),
        )
        const placementAttendance = calculateAttendanceStats(placementEvents)
        const placementScore = calculateEvaluationScore(placementEvaluations)

        return {
          ...placement,
          attendance: placementAttendance.checkInDays > 0 ? placementAttendance.attendanceRate : placement.attendance,
          performance: placementScore > 0 ? placementScore : placement.performance,
        }
      }),
    [attendanceEvents, liveTick, manualEvaluationItems, placementItems],
  )
  const programTrend = useMemo(
    () => buildProgramTrend(attendanceEvents, taskItems, reportItems, livePlacementItems),
    [attendanceEvents, livePlacementItems, reportItems, taskItems],
  )
  const overviewInsights = useMemo(
    () =>
      buildInsights(
        currentAttendanceStats,
        role === 'intern' ? currentInternTasks : taskItems,
        role === 'intern' ? currentInternReports : reportItems,
        currentEvaluationScore,
      ),
    [
      currentAttendanceStats,
      currentEvaluationScore,
      currentInternReports,
      currentInternTasks,
      reportItems,
      role,
      taskItems,
    ],
  )

  useEffect(() => {
    if (role === 'intern') {
      setCheckedIn(currentAttendanceStats.checkedInNow)
    }
  }, [currentAttendanceStats.checkedInNow, role])

  const dashboardMetrics = useMemo<Record<RoleId, Metric[]>>(() => {
    const activePlacementCount = livePlacementItems.filter((placement) => placement.status === 'Active').length
    const placementPercentage =
      livePlacementItems.length > 0 ? Math.round((activePlacementCount / livePlacementItems.length) * 100) : 0
    const visibleTasksForMetrics = role === 'intern' ? currentInternTasks : taskItems
    const openTaskCount = visibleTasksForMetrics.filter((task) => task.status !== 'Completed').length
    const completedTaskCount = visibleTasksForMetrics.filter((task) => task.status === 'Completed').length
    const taskCompletionRate = calculateTaskCompletionRate(visibleTasksForMetrics)
    const unresolvedComplaintCount = complaintItems.filter((complaint) => complaint.status !== 'Resolved').length
    const pendingReportCount = reportItems.filter((report) => !['Approved', 'Rejected'].includes(report.status)).length
    const companySupervisorPlacements = livePlacementItems.filter((placement) =>
      sameCredential(placement.company, sessionOrganization),
    )
    const universitySupervisorPlacements = livePlacementItems.filter((placement) =>
      sameCredential(placement.university, sessionOrganization),
    )

    return {
      admin: [
        { label: 'Total interns', value: String(livePlacementItems.length), delta: `${activePlacementCount} active now`, tone: 'blue' },
        { label: 'Active placements', value: String(activePlacementCount), delta: `${placementPercentage}% running`, tone: 'green' },
        { label: 'Attendance events', value: String(attendanceEvents.length), delta: 'Saved check-ins/out', tone: 'amber' },
        { label: 'Pending reports', value: String(pendingReportCount), delta: pendingReportCount ? 'Need review' : 'No pending reports', tone: 'violet' },
      ],
      intern: [
        {
          label: 'Attendance rate',
          value: `${currentAttendanceStats.attendanceRate}%`,
          delta: currentAttendanceStats.todayCheckedIn ? 'Checked in today' : 'No check-in today',
          tone: 'green',
        },
        {
          label: 'Hours logged',
          value: currentAttendanceStats.hoursLabel,
          delta: currentAttendanceStats.checkedInNow ? 'Live shift running' : 'From saved check-ins/out',
          tone: 'blue',
        },
        { label: 'Open tasks', value: String(openTaskCount), delta: `${completedTaskCount} completed`, tone: 'amber' },
        {
          label: 'Evaluation score',
          value: `${currentEvaluationScore}%`,
          delta: currentInternEvaluations.length ? 'From supervisor evaluations' : 'No evaluation submitted',
          tone: 'violet',
        },
      ],
      companySupervisor: [
        { label: 'Assigned interns', value: String(companySupervisorPlacements.length), delta: sessionOrganization || 'No organization', tone: 'blue' },
        { label: 'Attendance events', value: String(attendanceEvents.length), delta: 'Check-ins/out saved', tone: 'amber' },
        { label: 'Complaints queue', value: String(unresolvedComplaintCount), delta: 'Unresolved items', tone: 'violet' },
        { label: 'Tasks completed', value: `${taskCompletionRate}%`, delta: `${completedTaskCount}/${taskItems.length || 0} tasks`, tone: 'green' },
      ],
      universitySupervisor: [
        { label: 'Assigned students', value: String(universitySupervisorPlacements.length), delta: sessionOrganization || 'No organization', tone: 'blue' },
        { label: 'Reports pending', value: String(pendingReportCount), delta: pendingReportCount ? 'Awaiting university review' : 'No pending reports', tone: 'green' },
        { label: 'Attendance events', value: String(attendanceEvents.length), delta: 'Student check-ins/out', tone: 'amber' },
        {
          label: 'At-risk students',
          value: String(livePlacementItems.filter((placement) => placement.status === 'Needs review').length),
          delta: 'Need review placements',
          tone: 'red',
        },
      ],
    }
  }, [
    attendanceEvents.length,
    complaintItems,
    currentAttendanceStats,
    currentEvaluationScore,
    currentInternEvaluations.length,
    currentInternTasks,
    livePlacementItems,
    placementItems,
    reportItems,
    role,
    sessionLoginId,
    sessionName,
    sessionOrganization,
    taskItems,
  ])

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []

    const entries: Array<{ label: string; meta: string; view: ViewKey }> = [
      ...placementItems.map((item) => ({ label: item.name, meta: `${item.company} - ${item.status}`, view: 'directory' as ViewKey })),
      ...taskItems.map((item) => ({ label: item.title, meta: `${item.intern} - ${item.status}`, view: 'tasks' as ViewKey })),
      ...complaintItems.map((item) => ({ label: item.title, meta: `${item.submittedBy} - ${item.status}`, view: 'complaints' as ViewKey })),
    ]

    return entries
      .filter((entry) => canAccessView(entry.view, role) && `${entry.label} ${entry.meta}`.toLowerCase().includes(query))
      .slice(0, 5)
  }, [complaintItems, placementItems, role, searchQuery, taskItems])

  const triggerToast = (message: string) => {
    setToast(message)
  }

  const handleAttendanceEvent = (event: AttendanceEventRecord) => {
    if (
      sameCredential(event.studentNo ?? '', sessionLoginId) ||
      samePersonName(event.internName ?? '', sessionName)
    ) {
      setCheckedIn(event.type === 'check-in')
    }
    setAttendanceEvents((currentEvents) => {
      const nextEvents = sortAttendanceEvents([event, ...currentEvents.filter((item) => item.id !== event.id)]).slice(0, 100)
      writeStoredArray(attendanceEventsStorageKey, nextEvents)
      return nextEvents
    })
  }

  const handleCreateAccountRequest = async (request: AccountRequest) => {
    try {
      const payload = await apiJson<{ request: AccountRequest }>('/api/account-requests', {
        body: JSON.stringify(request),
        method: 'POST',
      })
      setAccountRequests((currentRequests) => {
        const nextRequests = [payload.request, ...currentRequests.filter((item) => item.id !== payload.request.id)]
        writeStoredArray(accountRequestsStorageKey, nextRequests)
        return nextRequests
      })
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Account request could not be submitted')
    }
  }

  const handleReviewAccountRequest = async (requestId: string, status: Exclude<AccountRequestStatus, 'Pending'>) => {
    const request = accountRequests.find((item) => item.id === requestId)
    if (!request || request.status !== 'Pending') return

    try {
      const payload = await apiJson<{ account: AppAccount | null; request: AccountRequest }>(
        `/api/account-requests/${encodeURIComponent(requestId)}/review`,
        {
          body: JSON.stringify({ status }),
          method: 'PATCH',
        },
      )
      const nextRequests = accountRequests.map((item) => (item.id === requestId ? payload.request : item))
      setAccountRequests(nextRequests)
      writeStoredArray(accountRequestsStorageKey, nextRequests)

      if (payload.account) {
        const approvedAccount = payload.account
        setApprovedAccounts((currentAccounts) => {
          const alreadyExists = currentAccounts.some(
            (account) =>
              sameCredential(account.email, approvedAccount.email) ||
              sameCredential(account.loginId, approvedAccount.loginId),
          )
          const nextAccounts = alreadyExists ? currentAccounts : [...currentAccounts, approvedAccount]
          writeStoredArray(approvedAccountsStorageKey, nextAccounts)
          return nextAccounts
        })

        if (approvedAccount.role === 'intern') {
          setPlacementItems((currentPlacements) => {
            const nextPlacements = mergeAccountPlacements(currentPlacements, [approvedAccount])
            writeStoredArray(placementsStorageKey, nextPlacements)
            return nextPlacements
          })
        }
      }

      triggerToast(`${request.name} account request ${status.toLowerCase()}`)
      return
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Account review failed')
    }
  }

  const resolveComplaint = async (complaintId: string) => {
    const complaint = complaintItems.find((item) => item.id === complaintId)
    if (!complaint || complaint.status === 'Resolved') return

    try {
      const payload = await apiJson<{ complaint: ComplaintRecord }>(
        `/api/complaints/${encodeURIComponent(complaintId)}/resolve`,
        { method: 'PATCH' },
      )
      setComplaintItems((items) => items.map((item) => (item.id === complaintId ? payload.complaint : item)))
      triggerToast(`${complaint.id} resolved`)
      return
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Complaint could not be resolved')
      return
    }
  }

  const sendAnnouncement = async () => {
    const title = announcementDraft.title.trim()
    const message = announcementDraft.message.trim()

    if (!title || !message) {
      triggerToast('Add an announcement title and message')
      return
    }

    const announcement: AnnouncementRecord = {
      audience: announcementDraft.audience,
      author: session?.name ?? 'System administrator',
      createdAt: new Date().toLocaleString(),
      id: `ANN-${Date.now()}`,
      message,
      title,
    }
    let savedAnnouncement = announcement
    try {
      const payload = await apiJson<{ announcement: AnnouncementRecord }>('/api/announcements', {
        body: JSON.stringify(announcement),
        method: 'POST',
      })
      savedAnnouncement = payload.announcement
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Announcement could not be posted')
      return
    }
    const nextAnnouncements = [savedAnnouncement, ...announcements]
    setAnnouncements(nextAnnouncements)
    writeStoredArray(announcementsStorageKey, nextAnnouncements)
    setAnnouncementDraft(defaultAnnouncementDraft)
    setAnnouncementComposerOpen(false)
    triggerToast(`Announcement posted to ${announcement.audience}`)
  }

  const handleSavePlacement = async (placement: InternRecord) => {
    let savedPlacement = placement

    try {
      const payload = await apiJson<{ placement: InternRecord }>('/api/placements', {
        body: JSON.stringify(placement),
        method: 'POST',
      })
      savedPlacement = payload.placement
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Placement could not be saved')
      return
    }

    setPlacementItems((currentPlacements) => {
      const existingIndex = currentPlacements.findIndex((item) => sameCredential(item.studentNo, savedPlacement.studentNo))
      const nextPlacements =
        existingIndex >= 0
          ? currentPlacements.map((item, index) => (index === existingIndex ? savedPlacement : item))
          : [savedPlacement, ...currentPlacements]
      writeStoredArray(placementsStorageKey, nextPlacements)
      return nextPlacements
    })
    triggerToast(`${savedPlacement.name} placement saved`)
  }

  const handleDeleteIntern = async (placement: InternRecord) => {
    const confirmed = window.confirm(
      `Delete ${placement.name} from Intern Nexus? This removes the intern account, placement, approval request, and assigned local API tasks.`,
    )
    if (!confirmed) return

    try {
      await apiJson<{ deleted: Record<string, number>; internName: string; studentNo: string }>(
        `/api/interns/${encodeURIComponent(placement.studentNo)}`,
        { method: 'DELETE' },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed'
      if (message.includes('Built-in account')) {
        triggerToast(message)
        return
      }

      triggerToast(message)
      return
    }

    setPlacementItems((currentPlacements) => {
      const nextPlacements = currentPlacements.filter((item) => !sameCredential(item.studentNo, placement.studentNo))
      writeStoredArray(placementsStorageKey, nextPlacements)
      return nextPlacements
    })
    setApprovedAccounts((currentAccounts) => {
      const nextAccounts = currentAccounts.filter((account) => !sameCredential(account.loginId, placement.studentNo))
      writeStoredArray(approvedAccountsStorageKey, nextAccounts)
      return nextAccounts
    })
    setAccountRequests((currentRequests) => {
      const nextRequests = currentRequests.filter((request) => !sameCredential(request.loginId, placement.studentNo))
      writeStoredArray(accountRequestsStorageKey, nextRequests)
      return nextRequests
    })
    triggerToast(`${placement.name} deleted from the intern register`)
  }

  const notificationItems = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = []
    const currentInternTask = (task: TaskRecord) =>
      session ? taskBelongsToSession(task, session) : false
    const taskBelongsToSupervisorOrganization = (task: TaskRecord) =>
      sameCredential(task.company ?? '', session?.organization ?? '') ||
      livePlacementItems.some(
        (placement) =>
          sameCredential(placement.company, session?.organization ?? '') &&
          taskBelongsToPlacement(task, placement),
      )
    const announcementVisibleToRole = (audience: string) => {
      const normalizedAudience = audience.trim().toLowerCase()
      if (role === 'admin') return true
      if (normalizedAudience === 'all users') return true
      if (role === 'intern') return ['interns', 'all interns'].includes(normalizedAudience)
      if (role === 'companySupervisor') return normalizedAudience === 'company supervisors'
      if (role === 'universitySupervisor') return normalizedAudience === 'university supervisors'

      return false
    }

    if (role === 'admin') {
      accountRequests
        .filter((request) => request.status === 'Pending')
        .forEach((request) => {
          items.push({
            actionLabel: 'Open approval',
            category: 'Account request',
            description: `${request.name} requested ${roles.find((roleOption) => roleOption.id === request.role)?.label ?? 'user'} access using ${request.loginId}.`,
            id: `account-${request.id}`,
            onAction: () => setActiveView('security'),
            onSecondaryAction: () => handleReviewAccountRequest(request.id, 'Approved'),
            secondaryActionLabel: 'Approve',
            time: request.requestedAt,
            title: `Approve ${request.name}`,
            tone: 'violet',
          })
        })
    }

    complaintItems
      .filter((complaint) => complaint.status !== 'Resolved')
      .filter((complaint) =>
        role === 'admin'
          ? true
          : role === 'intern'
            ? samePersonName(complaint.submittedBy, session?.name ?? '')
            : role === 'companySupervisor'
              ? complaint.audience === 'Company Supervisor' || samePersonName(complaint.submittedBy, session?.name ?? '')
              : complaint.audience === 'University Supervisor' || samePersonName(complaint.submittedBy, session?.name ?? ''),
      )
      .slice(0, 4)
      .forEach((complaint) => {
        items.push({
          actionLabel: 'Open complaint',
          category: 'Complaint',
          description: `${complaint.submittedBy}: ${complaint.latestComment}`,
          id: `complaint-${complaint.id}`,
          onAction: () => setActiveView('complaints'),
          onSecondaryAction: role === 'intern' ? undefined : () => resolveComplaint(complaint.id),
          secondaryActionLabel: role === 'intern' ? undefined : 'Resolve',
          time: complaint.submittedAt,
          title: complaint.title,
          tone: complaint.priority === 'High' ? 'red' : complaint.priority === 'Medium' ? 'amber' : 'green',
        })
      })

    attendanceEvents
      .filter(() => role === 'universitySupervisor' || role === 'admin')
      .slice(0, 8)
      .forEach((event) => {
        items.push({
          actionLabel: 'Open attendance',
          category: 'Attendance',
          description: `${event.message} University: ${event.university}.`,
          id: event.id,
          onAction: () => setActiveView('attendance'),
          time: event.occurredAt,
          title: event.title,
          tone: event.type === 'check-in' ? 'green' : 'blue',
        })
      })

    reportItems
      .filter((report) => {
        if (role === 'admin') return !['Approved', 'Rejected'].includes(report.status)
        if (role === 'intern') {
          return sameCredential(report.studentNo ?? '', session?.loginId ?? '') || samePersonName(report.owner, session?.name ?? '')
        }
        if (role === 'companySupervisor') {
          return sameCredential(report.company ?? '', session?.organization ?? '') && report.status === 'Pending company approval'
        }
        if (role === 'universitySupervisor') {
          return sameCredential(report.university ?? '', session?.organization ?? '') && report.status === 'Pending university approval'
        }

        return false
      })
      .slice(0, 6)
      .forEach((report) => {
        items.push({
          actionLabel: 'Open reports',
          category: 'Report',
          description:
            role === 'intern'
              ? `${report.title} is currently ${report.status}.`
              : `${report.owner} submitted ${report.title}. Current stage: ${report.status}.`,
          id: `report-${report.id ?? report.title}`,
          onAction: () => setActiveView('reports'),
          time: report.submitted,
          title:
            role === 'companySupervisor'
              ? 'Report waiting for company approval'
              : role === 'universitySupervisor'
                ? 'Report waiting for university review'
                : report.title,
          tone: report.status === 'Approved' ? 'green' : report.status === 'Rejected' ? 'red' : 'blue',
        })
      })

    taskItems
      .filter((task) => {
        const visibleStatus = taskBoardStatus(task)
        if (role === 'intern') {
          return currentInternTask(task) && ['Pending', 'Overdue', 'Rejected', 'Completed'].includes(visibleStatus)
        }
        if (role === 'companySupervisor') {
          return taskBelongsToSupervisorOrganization(task) && (taskAwaitingCompanyApproval(task) || task.status === 'Overdue')
        }
        if (role === 'admin') return taskAwaitingCompanyApproval(task) || task.status === 'Overdue'

        return false
      })
      .slice(0, role === 'intern' || role === 'companySupervisor' ? 8 : 5)
      .forEach((task) => {
        const awaitingApproval = taskAwaitingCompanyApproval(task)
        const visibleStatus = taskBoardStatus(task)
        const internTaskTone =
          task.status === 'Overdue' || visibleStatus === 'Rejected'
            ? 'red'
            : visibleStatus === 'Completed'
              ? 'green'
              : task.priority === 'High'
                ? 'amber'
                : task.priority === 'Low'
                  ? 'green'
                  : 'blue'
        const taskDescription =
          role === 'intern'
            ? visibleStatus === 'Completed'
              ? `${task.title} was approved by ${task.reviewedBy ?? 'your supervisor'}.`
              : visibleStatus === 'Rejected'
                ? `${task.title} was rejected. Update the work summary and submit again.`
                : `Supervisor assigned: ${task.title}. Due ${task.deadline}. Status: ${visibleStatus}.`
            : awaitingApproval
              ? `${task.intern} submitted ${task.title} for company supervisor approval.`
              : `${task.intern} has an overdue task due ${task.deadline}.`
        items.push({
          actionLabel: awaitingApproval ? 'Review work' : 'Open tasks',
          category: awaitingApproval ? 'Task review' : role === 'intern' && ['Completed', 'Rejected'].includes(visibleStatus) ? 'Task result' : 'Task',
          description: taskDescription,
          id: `task-${task.id ?? task.studentNo ?? task.intern}-${task.title}`,
          onAction: () => setActiveView('tasks'),
          time: awaitingApproval ? task.submittedAt ?? task.deadline : ['Completed', 'Rejected'].includes(visibleStatus) ? task.reviewedAt ?? task.deadline : task.deadline,
          title: role === 'intern' ? `Task ${visibleStatus.toLowerCase()}: ${task.title}` : awaitingApproval ? 'Task waiting for approval' : task.title,
          tone: role === 'intern' ? internTaskTone : awaitingApproval ? 'blue' : 'red',
        })
      })

    announcements.filter((announcement) => announcementVisibleToRole(announcement.audience)).slice(0, 4).forEach((announcement) => {
      items.push({
        category: 'Announcement',
        description: announcement.message,
        id: announcement.id,
        time: announcement.createdAt,
        title: `${announcement.title} (${announcement.audience})`,
        tone: 'green',
      })
    })

    return items
  }, [
    accountRequests,
    announcements,
    attendanceEvents,
    complaintItems,
    livePlacementItems,
    reportItems,
    role,
    session?.loginId,
    session?.name,
    session?.organization,
    taskItems,
  ])

  const handleLogin = (account: AppAccount, accessToken: string, expiresIn: number) => {
    const nextSession = createSession(account, accessToken, expiresIn)
    localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession))
    setSession(nextSession)
    setActiveView('overview')
    setSearchQuery('')
    triggerToast(`${account.name} logged in`)
  }

  const handleLogout = () => {
    localStorage.removeItem(sessionStorageKey)
    setSession(null)
    setActiveView('overview')
    setSearchQuery('')
  }

  if (!session) {
    return (
      <LoginView
        accountRequests={accountRequests}
        accounts={allAccounts}
        darkMode={darkMode}
        onCreateAccountRequest={handleCreateAccountRequest}
        onLogin={handleLogin}
        onToggleTheme={() => setDarkMode((value) => !value)}
      />
    )
  }

  return (
    <div className={darkMode ? 'app theme-dark' : 'app'}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img alt="" src={logoSrc} />
          </div>
          <div>
            <strong>Intern Nexus</strong>
            <span>Real-time internship OS</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={activeView === item.key ? 'nav-item active' : 'nav-item'}
                key={item.key}
                onClick={() => setActiveView(item.key)}
                type="button"
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="system-card">
          <div className="system-row">
            <Wifi size={17} aria-hidden="true" />
            <span>{systemHealth?.api ?? 'Online'}</span>
          </div>
          <div className="system-row">
            <Zap size={17} aria-hidden="true" />
            <span>{systemHealth?.latency ?? '42 ms'}</span>
          </div>
          <div className="system-row">
            <ShieldCheck size={17} aria-hidden="true" />
            <span>{systemHealth?.auditQueue ?? '14 events'}</span>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="search-wrap">
            <Search size={18} aria-hidden="true" />
            <input
              aria-label="Global search"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search students, reports, companies, tasks..."
              value={searchQuery}
            />
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result) => (
                  <button
                    key={`${result.label}-${result.meta}`}
                    onClick={() => {
                      setActiveView(result.view)
                      setSearchQuery('')
                    }}
                    type="button"
                  >
                    <span>{result.label}</span>
                    <small>{result.meta}</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="top-actions">
            <button
              className="icon-button"
              onClick={() => setDarkMode((value) => !value)}
              title="Toggle theme"
              type="button"
            >
              {darkMode ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            <button
              className="icon-button notify"
              onClick={() => setActiveView('notifications')}
              title="Notifications"
              type="button"
            >
              <Bell size={18} aria-hidden="true" />
              {notificationItems.length > 0 && <span className="notification-count">{notificationItems.length}</span>}
            </button>
            {role !== 'intern' && (
              <button
                className="action-button"
                onClick={() => setAnnouncementComposerOpen(true)}
                type="button"
              >
                <Send size={17} aria-hidden="true" />
                <span>Announce</span>
              </button>
            )}
            <button className="secondary-button" onClick={handleLogout} type="button">
              <LogOut size={17} aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <section className="session-strip" aria-label="Current session">
          <div className="session-card active">
            <span>Logged in as</span>
            <strong>{session.name}</strong>
            <small>{session.email}</small>
          </div>
          {role === 'admin' && (
            <div className="session-card">
              <span>Access level</span>
              <strong>Level {session.level}</strong>
              <small>{currentAccessLevel.label}</small>
            </div>
          )}
          <div className="session-card">
            <span>Dashboard</span>
            <strong>{currentAccessLevel.dashboard}</strong>
            <small>{session.organization}</small>
          </div>
        </section>

        <section className="hero-band">
          <div>
            <div className="eyebrow">
              <CircleDot size={12} aria-hidden="true" />
              <span>{roleAccent[role]}</span>
            </div>
            <h1>{currentRole.label} dashboard</h1>
            <p>{currentRole.summary}</p>
          </div>
          <div className="profile-panel">
            <div className="avatar">{session.name.charAt(0)}</div>
            <div>
              <strong>{session.name}</strong>
              <span>{session.organization}</span>
              <small>{role === 'admin' ? `${currentAccessLevel.label} level ${currentAccessLevel.level}` : currentRole.label}</small>
            </div>
          </div>
        </section>

        <section className="content">
          {activeView === 'overview' && (
            <OverviewDashboard
              attendanceStats={currentAttendanceStats}
              checkedIn={role === 'intern' ? currentAttendanceStats.checkedInNow : checkedIn}
              insightItems={overviewInsights}
              liveTick={liveTick}
              metrics={dashboardMetrics[role]}
              onNavigate={setActiveView}
              placements={livePlacementItems}
              programTrend={programTrend}
              role={role}
              triggerToast={triggerToast}
            />
          )}
          {activeView === 'attendance' && (
            <AttendanceView
          attendanceEvents={attendanceEvents}
          checkedIn={checkedIn}
          liveTick={liveTick}
          onAttendanceEvent={handleAttendanceEvent}
          placements={livePlacementItems}
              role={role}
              session={session}
              setCheckedIn={setCheckedIn}
              triggerToast={triggerToast}
            />
          )}
          {activeView === 'tasks' && (
            <TasksView
              placements={livePlacementItems}
              role={role}
              session={session}
              setTaskItems={setTaskItems}
              taskItems={taskItems}
              triggerToast={triggerToast}
            />
          )}
          {activeView === 'reports' && (
            <ReportsView
              placements={livePlacementItems}
              reportItems={reportItems}
              role={role}
              session={session}
              setReportItems={setReportItems}
              triggerToast={triggerToast}
            />
          )}
          {activeView === 'analytics' && (
            <AnalyticsView
              attendanceEvents={attendanceEvents}
              placements={livePlacementItems}
              reportItems={reportItems}
              taskItems={taskItems}
            />
          )}
          {activeView === 'evaluations' && (
            <EvaluationsView
              manualEvaluations={manualEvaluationItems}
              placements={livePlacementItems}
              role={role}
              session={session}
              setManualEvaluations={setManualEvaluationItems}
              triggerToast={triggerToast}
            />
          )}
          {activeView === 'complaints' && (
            <ComplaintsView
              complaintItems={complaintItems}
              role={role}
              session={session}
              setComplaintItems={setComplaintItems}
              triggerToast={triggerToast}
            />
          )}
          {activeView === 'documents' && <DocumentsView role={role} triggerToast={triggerToast} />}
          {activeView === 'rankings' && <RankingsView placements={livePlacementItems} />}
          {activeView === 'notifications' && (
            <NotificationsView notificationItems={notificationItems} onNavigate={setActiveView} />
          )}
          {activeView === 'access' && <AccessLevelsView role={role} />}
          {activeView === 'directory' && (
            <DirectoryView
              onDeleteIntern={handleDeleteIntern}
              onSavePlacement={handleSavePlacement}
              placements={livePlacementItems}
              role={role}
              triggerToast={triggerToast}
            />
          )}
          {activeView === 'security' && (
            <SecurityView accountRequests={accountRequests} onReviewAccountRequest={handleReviewAccountRequest} />
          )}
        </section>
      </main>

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{toast}</span>
        </div>
      )}

      {announcementComposerOpen && (
        <AnnouncementComposer
          draft={announcementDraft}
          onChange={setAnnouncementDraft}
          onClose={() => setAnnouncementComposerOpen(false)}
          onSend={sendAnnouncement}
        />
      )}
    </div>
  )
}

function LoginView({
  accountRequests,
  accounts,
  darkMode,
  onCreateAccountRequest,
  onLogin,
  onToggleTheme,
}: {
  accountRequests: AccountRequest[]
  accounts: AppAccount[]
  darkMode: boolean
  onCreateAccountRequest: (request: AccountRequest) => Promise<void> | void
  onLogin: (account: AppAccount, accessToken: string, expiresIn: number) => void
  onToggleTheme: () => void
}) {
  const [credential, setCredential] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [signupForm, setSignupForm] = useState<AccountRequestForm>(defaultAccountRequestForm)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const isSignupMode = authMode === 'signup'
  const signupRoleOptions = roles.filter((roleOption) => roleOption.id !== 'admin')

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const payload = await apiJson<{
        accessToken: string
        expiresIn: number
        user: {
          email: string
          loginId: string
          loginLabel?: string
          name: string
          organization: string
          role: RoleId
        }
      }>('/api/auth/login', {
        body: JSON.stringify({ credential, password }),
        method: 'POST',
      })
      const account: AppAccount = {
        email: payload.user.email,
        loginId: payload.user.loginId,
        loginLabel: payload.user.loginLabel ?? loginLabelsByRole[payload.user.role],
        name: payload.user.name,
        organization: payload.user.organization,
        role: payload.user.role,
      }
      setError('')
      setNotice('')
      onLogin(account, payload.accessToken, payload.expiresIn)
      return
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed. Check your credentials and try again.')
    }
  }

  const updateSignupField = (field: keyof AccountRequestForm, value: string) => {
    setSignupForm((currentForm) => ({ ...currentForm, [field]: value } as AccountRequestForm))
  }

  const submitSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const requestDraft: AccountRequestForm = {
      email: signupForm.email.trim(),
      loginId: signupForm.loginId.trim(),
      name: signupForm.name.trim(),
      note: signupForm.note.trim(),
      organization: signupForm.organization.trim(),
      password: signupForm.password,
      role: signupForm.role,
    }
    const emailLooksValid = /^\S+@\S+\.\S+$/.test(requestDraft.email)
    const duplicateAccount = accounts.some(
      (account) => sameCredential(account.email, requestDraft.email) || sameCredential(account.loginId, requestDraft.loginId),
    )
    const duplicateRequest = accountRequests.some(
      (request) =>
        request.status !== 'Rejected' &&
        (sameCredential(request.email, requestDraft.email) || sameCredential(request.loginId, requestDraft.loginId)),
    )

    if (!requestDraft.name || !requestDraft.email || !requestDraft.loginId || !requestDraft.organization) {
      setError('Fill in your name, email, assigned ID, and organization.')
      return
    }

    if (!emailLooksValid) {
      setError('Enter a valid email address.')
      return
    }

    if (requestDraft.password.length < 8) {
      setError('Create a password with at least 8 characters.')
      return
    }

    if (duplicateAccount || duplicateRequest) {
      setError('That email or assigned ID already exists or is waiting for administrator approval.')
      return
    }

    const request: AccountRequest = {
      ...requestDraft,
      id: `REQ-${Date.now()}`,
      loginLabel: loginLabelsByRole[requestDraft.role],
      requestedAt: new Date().toLocaleString(),
      status: 'Pending',
    }

    await onCreateAccountRequest(request)
    setAuthMode('login')
    setCredential(request.loginId)
    setPassword('')
    setSignupForm(defaultAccountRequestForm)
    setError('')
    setNotice('Account request submitted. An administrator can approve it in Security Center.')
  }

  return (
    <div className={darkMode ? 'login-page theme-dark' : 'login-page'}>
      <section className="login-shell">
        <div className="login-brand">
          <div className="brand-mark">
            <img alt="" src={logoSrc} />
          </div>
          <div>
            <strong>Intern Nexus</strong>
            <span>Internship management system</span>
          </div>
          <button className="icon-button" onClick={onToggleTheme} title="Toggle theme" type="button">
            {darkMode ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
        </div>

        <form className="login-card" onSubmit={isSignupMode ? submitSignup : submitLogin}>
          <div className="login-crest" aria-hidden="true">
            <img alt="" src={logoSrc} />
            <span>
              <ShieldCheck size={18} />
            </span>
          </div>

          <div className="login-card-heading">
            <h1>{isSignupMode ? 'Create Intern Nexus account' : 'Welcome to Intern Nexus'}</h1>
            <p>
              {isSignupMode
                ? 'Submit your details for administrator approval before your dashboard access is activated.'
                : 'Sign in with your official internship credentials to record or manage your internship work.'}
            </p>
          </div>

          {!isSignupMode ? (
            <>
              <label className="login-field">
                <span className="sr-only">Assigned ID or email</span>
                <span className="login-input-shell">
                  <Mail size={22} aria-hidden="true" />
                  <input
                    aria-label="Assigned ID or email"
                    onChange={(event) => setCredential(event.target.value)}
                    placeholder="Email or assigned ID"
                    type="text"
                    value={credential}
                  />
                </span>
              </label>

              <label className="login-field">
                <span className="sr-only">Password</span>
                <span className="login-input-shell">
                  <LockKeyhole size={22} aria-hidden="true" />
                  <input
                    aria-label="Password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    className="password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    type="button"
                  >
                    {showPassword ? <EyeOff size={21} aria-hidden="true" /> : <Eye size={21} aria-hidden="true" />}
                  </button>
                </span>
              </label>

              <div className="login-options">
                <label className="remember-control">
                  <input
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Remember Me</span>
                </label>
                <button
                  className="login-link"
                  onClick={() => {
                    setNotice('Password reset request sent to the registered email in local mode.')
                    setError('')
                  }}
                  type="button"
                >
                  Forgot Password?
                </button>
              </div>
            </>
          ) : (
            <div className="signup-form">
              <label className="login-field">
                <span className="sr-only">Full name</span>
                <span className="login-input-shell">
                  <UserCheck size={22} aria-hidden="true" />
                  <input
                    aria-label="Full name"
                    onChange={(event) => updateSignupField('name', event.target.value)}
                    placeholder="Full name"
                    type="text"
                    value={signupForm.name}
                  />
                </span>
              </label>

              <label className="login-field">
                <span className="sr-only">Email address</span>
                <span className="login-input-shell">
                  <Mail size={22} aria-hidden="true" />
                  <input
                    aria-label="Email address"
                    onChange={(event) => updateSignupField('email', event.target.value)}
                    placeholder="Email address"
                    type="email"
                    value={signupForm.email}
                  />
                </span>
              </label>

              <label className="login-field">
                <span className="sr-only">Assigned ID</span>
                <span className="login-input-shell">
                  <KeyRound size={22} aria-hidden="true" />
                  <input
                    aria-label="Assigned ID"
                    onChange={(event) => updateSignupField('loginId', event.target.value)}
                    placeholder="Student or staff ID"
                    type="text"
                    value={signupForm.loginId}
                  />
                </span>
              </label>

              <label className="login-field">
                <span className="sr-only">Account type</span>
                <span className="login-input-shell">
                  <ShieldCheck size={22} aria-hidden="true" />
                  <select
                    aria-label="Account type"
                    onChange={(event) => updateSignupField('role', event.target.value)}
                    value={signupForm.role}
                  >
                    {signupRoleOptions.map((roleOption) => (
                      <option key={roleOption.id} value={roleOption.id}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className="login-field">
                <span className="sr-only">Organization</span>
                <span className="login-input-shell">
                  <Building2 size={22} aria-hidden="true" />
                  <input
                    aria-label="Organization"
                    onChange={(event) => updateSignupField('organization', event.target.value)}
                    placeholder="University, company, or department"
                    type="text"
                    value={signupForm.organization}
                  />
                </span>
              </label>

              <label className="login-field">
                <span className="sr-only">Create password</span>
                <span className="login-input-shell">
                  <LockKeyhole size={22} aria-hidden="true" />
                  <input
                    aria-label="Create password"
                    onChange={(event) => updateSignupField('password', event.target.value)}
                    placeholder="Create password"
                    type={showPassword ? 'text' : 'password'}
                    value={signupForm.password}
                  />
                  <button
                    className="password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    type="button"
                  >
                    {showPassword ? <EyeOff size={21} aria-hidden="true" /> : <Eye size={21} aria-hidden="true" />}
                  </button>
                </span>
              </label>

              <label className="login-field">
                <span className="sr-only">Department or reason</span>
                <span className="login-input-shell multiline">
                  <FileText size={22} aria-hidden="true" />
                  <textarea
                    aria-label="Department or reason"
                    onChange={(event) => updateSignupField('note', event.target.value)}
                    placeholder="Department, course, placement, or reason for access"
                    value={signupForm.note}
                  />
                </span>
              </label>
            </div>
          )}

          {error && <p className="login-error">{error}</p>}
          {notice && <p className="login-notice">{notice}</p>}

          <button className="primary-button login-submit" type="submit">
            {isSignupMode ? 'Submit request' : 'Log In'}
          </button>

          {isSignupMode ? (
            <div className="signup-row">
              <span>Already approved?</span>
              <button
                className="login-link strong"
                onClick={() => {
                  setAuthMode('login')
                  setError('')
                  setNotice('')
                }}
                type="button"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="login-divider">
                <span>or</span>
              </div>

              <button
                className="google-button"
                disabled
                title="Google sign-in needs Google Cloud credentials before it can be enabled."
                type="button"
              >
                <span className="google-mark" aria-hidden="true">
                  G
                </span>
                <span>Google sign-in not enabled</span>
              </button>

              <div className="signup-row">
                <span>New on our platform?</span>
                <button
                  className="login-link strong"
                  onClick={() => {
                    setAuthMode('signup')
                    setError('')
                    setNotice('')
                  }}
                  type="button"
                >
                  Create an account
                </button>
              </div>

              <small className="login-hint">
                Sign in with your approved Intern Nexus credentials or create an account for administrator approval.
              </small>
            </>
          )}
        </form>
      </section>
    </div>
  )
}

function NotificationsView({
  notificationItems,
  onNavigate,
}: {
  notificationItems: NotificationItem[]
  onNavigate: (view: ViewKey) => void
}) {
  const criticalCount = notificationItems.filter((item) => item.tone === 'red').length
  const approvalCount = notificationItems.filter((item) => item.category === 'Account request').length

  return (
    <div className="module-stack">
      <div className="module-header">
        <div>
          <span className="eyebrow-text">Actionable alerts, approvals, issues</span>
          <h2>Notification center</h2>
        </div>
        <StatusPill status={`${notificationItems.length} active`} />
      </div>

      <div className="notification-summary-grid">
        <article className="mini-card">
          <Bell size={19} aria-hidden="true" />
          <span>Active notifications</span>
          <strong>{notificationItems.length}</strong>
        </article>
        <article className="mini-card">
          <UserCheck size={19} aria-hidden="true" />
          <span>Account approvals</span>
          <strong>{approvalCount}</strong>
        </article>
        <article className="mini-card">
          <AlertTriangle size={19} aria-hidden="true" />
          <span>Critical items</span>
          <strong>{criticalCount}</strong>
        </article>
      </div>

      <section className="panel">
        <PanelHeader icon={Bell} title="Inbox" />
        {notificationItems.length === 0 ? (
          <div className="empty-state">
            <strong>No active notifications</strong>
            <p>Account requests, attendance events, unresolved complaints, overdue tasks, pending reports, and announcements will appear here.</p>
            <button className="secondary-button" onClick={() => onNavigate('overview')} type="button">
              <Home size={16} aria-hidden="true" />
              <span>Back to dashboard</span>
            </button>
          </div>
        ) : (
          <div className="notification-list">
            {notificationItems.map((item) => (
              <article className={`notification-card tone-${item.tone}`} key={item.id}>
                <div className="notification-card-main">
                  <div>
                    <span>{item.category}</span>
                    <strong>{item.title}</strong>
                  </div>
                  <time>{item.time}</time>
                </div>
                <p>{item.description}</p>
                {(item.onAction || item.onSecondaryAction) && (
                  <div className="button-row">
                    {item.onAction && (
                      <button className="secondary-button" onClick={item.onAction} type="button">
                        <Eye size={16} aria-hidden="true" />
                        <span>{item.actionLabel ?? 'Open'}</span>
                      </button>
                    )}
                    {item.onSecondaryAction && (
                      <button className="primary-button" onClick={item.onSecondaryAction} type="button">
                        <CheckCircle2 size={16} aria-hidden="true" />
                        <span>{item.secondaryActionLabel ?? 'Complete'}</span>
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function AnnouncementComposer({
  draft,
  onChange,
  onClose,
  onSend,
}: {
  draft: AnnouncementDraft
  onChange: Dispatch<SetStateAction<AnnouncementDraft>>
  onClose: () => void
  onSend: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="modal-panel"
        onSubmit={(event) => {
          event.preventDefault()
          onSend()
        }}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow-text">Broadcast message</span>
            <h2>New announcement</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Close announcement composer" type="button">
            <AlertTriangle size={17} aria-hidden="true" />
          </button>
        </div>

        <div className="form-stack">
          <label>
            <span>Audience</span>
            <select
              onChange={(event) => onChange((current) => ({ ...current, audience: event.target.value }))}
              value={draft.audience}
            >
              <option>All users</option>
              <option>Interns</option>
              <option>Company supervisors</option>
              <option>University supervisors</option>
              <option>Administrators</option>
            </select>
          </label>
          <label>
            <span>Title</span>
            <input
              onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))}
              placeholder="e.g. Weekly report deadline"
              value={draft.title}
            />
          </label>
          <label>
            <span>Message</span>
            <textarea
              onChange={(event) => onChange((current) => ({ ...current, message: event.target.value }))}
              placeholder="Write the announcement users should see in notifications."
              rows={5}
              value={draft.message}
            />
          </label>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="primary-button" type="submit">
            <Send size={16} aria-hidden="true" />
            <span>Post announcement</span>
          </button>
        </div>
      </form>
    </div>
  )
}

interface ViewProps {
  triggerToast: (message: string) => void
}

function OverviewDashboard({
  role,
  metrics,
  placements,
  onNavigate,
  triggerToast,
  checkedIn,
  attendanceStats,
  insightItems,
  liveTick,
  programTrend,
}: ViewProps & {
  attendanceStats: ReturnType<typeof calculateAttendanceStats>
  role: RoleId
  metrics: Metric[]
  placements: InternRecord[]
  onNavigate: (view: ViewKey) => void
  checkedIn: boolean
  insightItems: string[]
  liveTick: number
  programTrend: TrendPoint[]
}) {
  const roleInfo = rolePanels[role]
  const overviewPlacement = placements.find((placement) => placement.status === 'Active') ?? placements[0]
  const exportDashboard = () => {
    const rows = metrics.map((metric) => `${metric.label},${metric.value},${metric.delta}`)
    downloadTextFile(
      'intern-nexus-dashboard-summary.csv',
      ['Metric,Value,Delta', ...rows].join('\n'),
      'text/csv',
    )
    triggerToast('Dashboard summary downloaded')
  }

  return (
    <div className="dashboard-grid">
      <div className="metrics-grid">
        {metrics.map((metric, index) => (
          <MetricCard
            icon={metricIcons[index] ?? Activity}
            key={metric.label}
            metric={metric}
            onClick={role === 'admin' && metric.label === 'Active placements' ? () => onNavigate('directory') : undefined}
          />
        ))}
      </div>

      {role === 'admin' && (
        <section className="panel wide-panel">
          <PanelHeader
            actionIcon={Eye}
            actionLabel="View all"
            icon={Building2}
            onAction={() => onNavigate('directory')}
            title="Active placements"
          />
          <PlacementTable compact placements={placements.slice(0, 6)} />
        </section>
      )}

      <section className="panel wide-panel">
        <PanelHeader
          actionLabel="Export"
          icon={LineChart}
          onAction={exportDashboard}
          title="Program pulse"
        />
        <div className="chart-area">
          <TrendChart
            colorA="#2f6fbb"
            colorB="#d89a25"
            data={programTrend}
            labelA="Attendance"
            labelB="Punctuality"
            seriesA="attendance"
            seriesB="punctuality"
          />
        </div>
      </section>

      <section className="panel">
        <PanelHeader icon={Bot} title="AI supervision insights" />
        <div className="insight-list">
          {insightItems.length === 0 ? (
            <div className="empty-state">
              <strong>No live insights yet</strong>
              <p>Attendance, tasks, reports, and evaluations will generate insights as records are created.</p>
            </div>
          ) : (
            insightItems.map((insight, index) => (
              <div className="insight-item" key={insight}>
                <span>{index + 1}</span>
                <p>{insight}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <PanelHeader icon={ClipboardList} title={roleInfo.title} />
        <div className="feature-list">
          {roleInfo.items.map((item) => (
            <div className="feature-line" key={item}>
              <CheckCircle2 size={17} aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelHeader icon={QrCode} title="Attendance console" />
        <div className="attendance-console">
          <div className={checkedIn ? 'status-orb green' : 'status-orb amber'}>
            {role === 'intern' ? (checkedIn ? 'Working' : 'Ready') : attendanceStats.todayCheckedIn ? 'Active' : 'Waiting'}
          </div>
          <div>
            <strong>
              {role === 'intern'
                ? checkedIn
                  ? 'Checked in'
                  : 'Awaiting check-in'
                : attendanceStats.todayCheckedIn
                  ? 'Intern attendance received today'
                  : 'No intern check-in today'}
            </strong>
            <span>
              {overviewPlacement
                ? role === 'intern'
                  ? `Assigned workplace: ${overviewPlacement.company}`
                  : `${attendanceStats.checkInDays} recorded attendance day(s)`
                : 'No placement assigned yet'}
            </span>
            <small>{attendanceStats.hoursLabel} logged from saved attendance events</small>
          </div>
        </div>
        <div className="button-row">
          <button className="secondary-button" onClick={() => onNavigate('attendance')} type="button">
            <MapPin size={16} aria-hidden="true" />
            <span>Open attendance</span>
          </button>
          {role === 'intern' && (
            <button className="secondary-button" onClick={() => onNavigate('attendance')} type="button">
              <QrCode size={16} aria-hidden="true" />
              <span>Check in/out</span>
            </button>
          )}
        </div>
      </section>

      <section className="panel">
        <PanelHeader icon={Clock} title={`Live activity - ${liveTick}s`} />
        <ActivityFeed logs={[]} />
      </section>
    </div>
  )
}

function MetricCard({ metric, icon: Icon, onClick }: { metric: Metric; icon: LucideIcon; onClick?: () => void }) {
  const openWithKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (!onClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <article
      className={`metric-card tone-${metric.tone}${onClick ? ' clickable' : ''}`}
      onClick={onClick}
      onKeyDown={openWithKeyboard}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="metric-icon">
        <Icon size={20} aria-hidden="true" />
      </div>
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      <small>{metric.delta}</small>
    </article>
  )
}

function PanelHeader({
  title,
  icon: Icon,
  actionLabel,
  actionIcon: ActionIcon = Download,
  onAction,
}: {
  title: string
  icon: LucideIcon
  actionLabel?: string
  actionIcon?: LucideIcon
  onAction?: () => void
}) {
  return (
    <div className="panel-header">
      <div>
        <Icon size={18} aria-hidden="true" />
        <h2>{title}</h2>
      </div>
      {actionLabel && (
        <button className="ghost-button" onClick={onAction} type="button">
          <ActionIcon size={15} aria-hidden="true" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  )
}

function ActivityFeed({ logs }: { logs: ActivityLog[] }) {
  return (
    <div className="activity-feed">
      {logs.length === 0 ? (
        <div className="empty-state">
          <strong>No activity yet</strong>
          <p>Real system actions will appear here.</p>
        </div>
      ) : (
        logs.map((log) => (
          <div className="activity-line" key={`${log.actor}-${log.time}`}>
            <span className={`dot tone-${log.tone}`} />
            <div>
              <strong>{log.actor}</strong>
              <p>{log.action}</p>
            </div>
            <time>{log.time}</time>
          </div>
        ))
      )}
    </div>
  )
}

function AttendanceView({
  attendanceEvents,
  checkedIn,
  liveTick,
  onAttendanceEvent,
  placements,
  role,
  session,
  setCheckedIn,
  triggerToast,
}: ViewProps & {
  attendanceEvents: AttendanceEventRecord[]
  checkedIn: boolean
  liveTick: number
  onAttendanceEvent: (event: AttendanceEventRecord) => void
  placements: InternRecord[]
  role: RoleId
  session: LoginSession
  setCheckedIn: (value: boolean) => void
}) {
  const [geoState, setGeoState] = useState<GeoState>({ status: 'idle' })
  const [watchId, setWatchId] = useState<number | null>(null)
  const [qrScannedAt, setQrScannedAt] = useState('')
  const [policyOpen, setPolicyOpen] = useState(false)
  const canManageAttendance = role === 'intern'
  const assignedPlacement = useMemo(
    () =>
      placements.find((placement) => sameCredential(placement.studentNo, session.loginId)) ??
      placements.find((placement) => sameCredential(placement.name, session.name)) ??
      null,
    [placements, session.loginId, session.name],
  )
  const assignedCompanySite =
    companySiteForPlacement(assignedPlacement) ?? companySiteForName(session.organization) ?? fallbackCompanySite
  const liveLocation = geoState.location
  const mapLatitude = liveLocation?.latitude ?? assignedCompanySite.latitude
  const mapLongitude = liveLocation?.longitude ?? assignedCompanySite.longitude
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${mapLongitude - 0.004}%2C${
    mapLatitude - 0.004
  }%2C${mapLongitude + 0.004}%2C${mapLatitude + 0.004}&layer=mapnik&marker=${mapLatitude}%2C${mapLongitude}`
  const externalMapUrl = `https://www.openstreetmap.org/?mlat=${mapLatitude}&mlon=${mapLongitude}#map=17/${mapLatitude}/${mapLongitude}`
  const googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${mapLatitude},${mapLongitude}`
  const attendanceRows = useMemo<AttendanceRecord[]>(() => {
    const rowsByStudent = new Map<string, AttendanceRecord & { openCheckIn?: Date | null; totalMs: number }>()
    const todayKey = localDateKey(new Date())

    ;[...attendanceEvents]
      .filter((event) => localDateKey(parseStoredDate(event.occurredAt)) === todayKey)
      .sort((left, right) => parseStoredDate(left.occurredAt).getTime() - parseStoredDate(right.occurredAt).getTime())
      .forEach((event) => {
      const key = event.studentNo || event.internName
      const current =
        rowsByStudent.get(key) ??
        ({
          checkIn: '-',
          checkOut: '-',
          distance: formatMeters(event.distanceMeters),
          hours: '-',
          location: event.company,
          name: event.internName,
          openCheckIn: null,
          status: 'Absent',
          studentNo: event.studentNo,
          totalMs: 0,
        } satisfies AttendanceRecord & { openCheckIn?: Date | null; totalMs: number })

      if (event.type === 'check-in') {
        current.checkIn = event.occurredAt
        current.checkOut = 'Working'
        current.distance = formatMeters(event.distanceMeters)
        current.hours = 'In progress'
        current.location = event.company
        current.openCheckIn = parseStoredDate(event.occurredAt)
        current.status = 'Working'
        current.studentNo = event.studentNo
      } else {
        const checkedOutAt = parseStoredDate(event.occurredAt)
        if (current.openCheckIn) {
          current.totalMs += Math.max(0, checkedOutAt.getTime() - current.openCheckIn.getTime())
          current.openCheckIn = null
        }
        current.checkOut = event.occurredAt
        current.distance = formatMeters(event.distanceMeters)
        current.hours = formatHours(current.totalMs / 3_600_000)
        current.location = event.company
        current.status = 'Checked out'
        current.studentNo = event.studentNo
      }

      rowsByStudent.set(key, current)
    })

    return Array.from(rowsByStudent.values()).map(({ openCheckIn, totalMs, ...record }) => {
      if (openCheckIn) {
        const sameDay = localDateKey(openCheckIn) === localDateKey(new Date())
        const runningMs = sameDay ? Math.max(0, Date.now() - openCheckIn.getTime()) : 0
        const liveHours = (totalMs + runningMs) / 3_600_000
        return {
          ...record,
          hours: liveHours > 0 ? `${formatHours(liveHours)} so far` : 'In progress',
        }
      }

      return record
    })
  }, [attendanceEvents, liveTick])
  const personalAttendanceRows = attendanceRows.filter(
    (record) =>
      sameCredential(record.studentNo ?? '', session.loginId) ||
      sameCredential(record.name, session.name) ||
      samePersonName(record.name, session.name) ||
      (assignedPlacement?.name ? samePersonName(record.name, assignedPlacement.name) : false),
  )
  const personalAttendanceFallback: AttendanceRecord = {
    checkIn: checkedIn ? liveLocation?.updatedAt ?? 'Captured' : '-',
    checkOut: checkedIn ? 'Working' : '-',
    distance: liveLocation ? formatMeters(liveLocation.distanceMeters) : '-',
    hours: checkedIn ? 'In progress' : '0h',
    location: assignedCompanySite.name,
    name: session.name,
    status: checkedIn ? 'Working' : 'Absent',
    studentNo: session.loginId,
  }
  const visibleAttendanceRows =
    role === 'intern'
      ? personalAttendanceRows.length > 0
        ? personalAttendanceRows
        : [personalAttendanceFallback]
      : attendanceRows

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [watchId])

  const applyPosition = (position: GeolocationPosition, status: GeoStatus) => {
    const latitude = position.coords.latitude
    const longitude = position.coords.longitude
    const distanceMeters = calculateDistanceMeters(
      { latitude, longitude },
      { latitude: assignedCompanySite.latitude, longitude: assignedCompanySite.longitude },
    )

    setGeoState({
      location: {
        accuracy: Math.round(position.coords.accuracy),
        distanceMeters,
        geofencePassed: distanceMeters <= assignedCompanySite.radiusMeters,
        latitude,
        longitude,
        updatedAt: new Date(position.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      },
      status,
    })
  }

  const handleGeoError = (error: GeolocationPositionError) => {
    setGeoState({
      error:
        error.code === error.PERMISSION_DENIED
          ? 'Location permission denied. Allow location access in the browser to use GPS check-in.'
          : error.message,
      status: 'blocked',
    })
    triggerToast('GPS location could not be captured')
  }

  const requestCurrentLocation = (onSuccess?: (location: LiveLocation) => void) => {
    if (!navigator.geolocation) {
      setGeoState({ error: 'This browser does not support geolocation.', status: 'unsupported' })
      triggerToast('GPS is not supported in this browser')
      return
    }

    setGeoState((current) => ({ ...current, error: undefined, status: 'watching' }))
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        const distanceMeters = calculateDistanceMeters(
          { latitude, longitude },
          { latitude: assignedCompanySite.latitude, longitude: assignedCompanySite.longitude },
        )
        const location = {
          accuracy: Math.round(position.coords.accuracy),
          distanceMeters,
          geofencePassed: distanceMeters <= assignedCompanySite.radiusMeters,
          latitude,
          longitude,
          updatedAt: new Date(position.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        }

        setGeoState({ location, status: 'ready' })
        onSuccess?.(location)
      },
      handleGeoError,
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    )
  }

  const startLiveGps = () => {
    if (!navigator.geolocation) {
      setGeoState({ error: 'This browser does not support geolocation.', status: 'unsupported' })
      triggerToast('GPS is not supported in this browser')
      return
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
    }

    const nextWatchId = navigator.geolocation.watchPosition(
      (position) => applyPosition(position, 'watching'),
      handleGeoError,
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    )
    setWatchId(nextWatchId)
    setGeoState((current) => ({ ...current, error: undefined, status: 'watching' }))
    triggerToast('Live GPS tracking started')
  }

  const stopLiveGps = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
    }
    setGeoState((current) => ({ ...current, status: current.location ? 'ready' : 'idle' }))
    triggerToast('Live GPS tracking stopped')
  }

  const createLocalAttendanceEvent = (type: AttendanceEventRecord['type'], location?: LiveLocation): AttendanceEventRecord => {
    const checkedInEvent = type === 'check-in'
    const internName = assignedPlacement?.name ?? session.name
    const company = assignedPlacement?.company ?? session.organization

    return {
      audience: 'University Supervisor',
      category: 'Attendance',
      company,
      distanceMeters: location?.distanceMeters ?? null,
      geofencePassed: location?.geofencePassed ?? true,
      gpsAccuracyMeters: location?.accuracy ?? null,
      id: `ATT-LOCAL-${Date.now()}`,
      internName,
      message: `${internName} ${checkedInEvent ? 'checked in' : 'checked out'} at ${company}.`,
      occurredAt: new Date().toLocaleString(),
      status: checkedInEvent ? 'Working' : 'Checked out',
      studentNo: assignedPlacement?.studentNo ?? session.loginId,
      title: `${internName} ${checkedInEvent ? 'checked in' : 'checked out'}`,
      type,
      university: assignedPlacement?.university ?? session.organization,
    }
  }

  const saveGpsCheckIn = async (location: LiveLocation) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/attendance/check-in`, {
        body: JSON.stringify({
          company: assignedPlacement?.company ?? session.organization,
          gps: {
            accuracy: location.accuracy,
            latitude: location.latitude,
            longitude: location.longitude,
          },
          studentNo: session.loginId,
        }),
        headers: {
          'Content-Type': 'application/json',
          ...(readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {}),
        },
        method: 'POST',
      })

      const result = (await response.json()) as AttendanceCheckInResult & { error?: string }
      if (!response.ok) {
        return {
          accepted: false,
          distanceMeters: location.distanceMeters,
          geofencePassed: false,
          policyMode: 'strict',
          rejectionReason: result.error ?? 'Attendance API rejected the request',
          status: 'Rejected',
        } satisfies AttendanceCheckInResult
      }

      return result
    } catch {
      triggerToast('GPS verified locally; API save unavailable')
      return null
    }
  }

  const saveGpsCheckOut = async (location: LiveLocation) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/attendance/check-out`, {
        body: JSON.stringify({
          company: assignedPlacement?.company ?? session.organization,
          gps: {
            accuracy: location.accuracy,
            latitude: location.latitude,
            longitude: location.longitude,
          },
          studentNo: session.loginId,
        }),
        headers: {
          'Content-Type': 'application/json',
          ...(readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {}),
        },
        method: 'POST',
      })
      const result = (await response.json()) as { attendanceEvent?: AttendanceEventRecord; error?: string }
      if (!response.ok) {
        triggerToast(result.error ?? 'Check-out could not be saved')
        return
      }

      if (result.attendanceEvent) {
        onAttendanceEvent(result.attendanceEvent)
      }
      setCheckedIn(false)
      triggerToast('Checked out and university supervisor notified')
    } catch {
      onAttendanceEvent(createLocalAttendanceEvent('check-out', location))
      setCheckedIn(false)
      triggerToast('Checked out locally; API save unavailable')
    }
  }

  const submitCheckIn = () => {
    requestCurrentLocation((location) => {
      void (async () => {
        const result = await saveGpsCheckIn(location)
        const accepted = result?.accepted ?? location.geofencePassed

        if (!accepted) {
          setCheckedIn(false)
          triggerToast(
            result?.rejectionReason ??
              `Outside ${assignedCompanySite.name} radius: ${formatMeters(location.distanceMeters)} from site, allowed ${assignedCompanySite.radiusMeters} m.`,
          )
          return
        }

        onAttendanceEvent(result?.attendanceEvent ?? createLocalAttendanceEvent('check-in', location))
        setCheckedIn(true)
        triggerToast(
          result === null
            ? 'Checked in locally; API save unavailable'
            : result.geofencePassed === false && result.policyMode === 'local-test'
            ? 'GPS captured and saved in local testing mode'
            : 'Checked in with live GPS verification',
        )
      })()
    })
  }

  const submitCheckOut = () => {
    requestCurrentLocation((location) => {
      void saveGpsCheckOut(location)
    })
  }

  return (
    <div className="module-stack">
      <div className="module-header">
        <div>
          <span className="eyebrow-text">GPS, QR, device, IP, duration</span>
          <h2>{canManageAttendance ? 'Real-time attendance' : 'Intern attendance monitor'}</h2>
        </div>
        {canManageAttendance && (
          <div className="button-row">
            <button
              className="primary-button"
              onClick={submitCheckIn}
              type="button"
            >
              <MapPin size={17} aria-hidden="true" />
              <span>Check in</span>
            </button>
            <button
              className="secondary-button"
              onClick={watchId === null ? startLiveGps : stopLiveGps}
              type="button"
            >
              <Wifi size={17} aria-hidden="true" />
              <span>{watchId === null ? 'Live GPS' : 'Stop GPS'}</span>
            </button>
            <button
              className="secondary-button"
              onClick={submitCheckOut}
              type="button"
            >
              <Clock size={17} aria-hidden="true" />
              <span>Check out</span>
            </button>
          </div>
        )}
      </div>

      {canManageAttendance ? (
        <>
          <div className="split-grid">
            <section className="panel">
              <PanelHeader icon={Smartphone} title="Verification snapshot" />
              <div className="verification-map">
                <div
                  className={
                    liveLocation?.geofencePassed
                      ? 'map-ring geofence-pass'
                      : liveLocation
                        ? 'map-ring geofence-fail'
                        : 'map-ring'
                  }
                >
                  <MapPin size={32} aria-hidden="true" />
                </div>
                <div className="map-details">
                  <strong>
                    {liveLocation
                      ? liveLocation.geofencePassed
                        ? 'Inside allowed radius'
                        : 'Outside allowed radius'
                      : checkedIn
                        ? 'Check-in active'
                        : 'Ready for live GPS check'}
                  </strong>
                  <span>Assigned company: {assignedCompanySite.name}</span>
                  <span>Company coordinates: {formatCoordinates(assignedCompanySite)}</span>
                  <span>Allowed radius: {assignedCompanySite.radiusMeters} m</span>
                  <span>Current distance: {formatMeters(liveLocation?.distanceMeters)}</span>
                  <span>GPS accuracy: {formatMeters(liveLocation?.accuracy)}</span>
                  <span>Coordinates: {liveLocation ? `${liveLocation.latitude.toFixed(6)}, ${liveLocation.longitude.toFixed(6)}` : 'Not captured yet'}</span>
                  <span>Last update: {liveLocation?.updatedAt ?? 'Waiting'}</span>
                  {geoState.error && <span className="gps-error">{geoState.error}</span>}
                </div>
              </div>
            </section>

            <section className="panel">
              <PanelHeader icon={MapPin} title="Live map" />
              <div className="live-map">
                <iframe
                  src={mapUrl}
                  title="Live GPS map"
                />
              </div>
              <div className="button-row">
                <a className="secondary-link" href={externalMapUrl} rel="noreferrer" target="_blank">
                  <MapPin size={16} aria-hidden="true" />
                  <span>Open map</span>
                </a>
                <a className="secondary-link" href={googleMapUrl} rel="noreferrer" target="_blank">
                  <MapPin size={16} aria-hidden="true" />
                  <span>Google Maps</span>
                </a>
              </div>
            </section>
          </div>

          <div className="split-grid">
            <section className="panel">
              <PanelHeader icon={QrCode} title="Company QR attendance" />
              <div className="qr-box" aria-label="Sample QR code">
                {Array.from({ length: 49 }, (_, index) => (
                  <span key={index} className={(index * 7 + index) % 5 === 0 ? 'filled' : ''} />
                ))}
              </div>
              <div className="button-row">
                <button
                  className="secondary-button"
                  onClick={() => {
                const scannedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                setQrScannedAt(scannedAt)
                setCheckedIn(true)
                onAttendanceEvent(createLocalAttendanceEvent('check-in', liveLocation))
                triggerToast('QR attendance accepted')
              }}
                  type="button"
                >
                  <QrCode size={16} aria-hidden="true" />
                  <span>Scan code</span>
                </button>
                <button className="secondary-button" onClick={() => setPolicyOpen((value) => !value)} type="button">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <span>Policy</span>
                </button>
              </div>
              {qrScannedAt && (
                <div className="inline-success compact">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>QR attendance accepted at {qrScannedAt}</span>
                </div>
              )}
              {policyOpen && (
                <div className="policy-panel">
                  <strong>Attendance warning policy</strong>
                  <p>Late arrivals above three times in seven days are flagged for supervisor review.</p>
                  <p>Check-in is blocked outside the approved company radius unless a supervisor resolves the exception.</p>
                  <p>QR check-in must be paired with GPS or supervisor approval before payroll/report export.</p>
                </div>
              )}
            </section>

            <section className="panel">
              <PanelHeader icon={ShieldCheck} title="GPS security checks" />
              <div className="security-checks">
                <div>
                  <CheckCircle2 size={17} aria-hidden="true" />
                  <span>Browser permission required before GPS is read</span>
                </div>
                <div>
                  <CheckCircle2 size={17} aria-hidden="true" />
                  <span>Distance is recalculated against registered company coordinates</span>
                </div>
                <div>
                  <CheckCircle2 size={17} aria-hidden="true" />
                  <span>Check-in is blocked when outside the allowed radius</span>
                </div>
                <div>
                  <CheckCircle2 size={17} aria-hidden="true" />
                  <span>Coordinates, accuracy, timestamp, device, and IP are API-ready</span>
                </div>
              </div>
            </section>
          </div>
        </>
      ) : (
        <section className="panel">
          <PanelHeader icon={ClipboardCheck} title="Supervisor attendance view" />
          <div className="notification-summary-grid">
            <article className="mini-card">
              <CheckCircle2 size={19} aria-hidden="true" />
              <span>Check-ins</span>
              <strong>{attendanceEvents.filter((event) => event.type === 'check-in').length}</strong>
            </article>
            <article className="mini-card">
              <Clock size={19} aria-hidden="true" />
              <span>Check-outs</span>
              <strong>{attendanceEvents.filter((event) => event.type === 'check-out').length}</strong>
            </article>
            <article className="mini-card">
              <MapPin size={19} aria-hidden="true" />
              <span>Inside geofence</span>
              <strong>{attendanceEvents.filter((event) => event.geofencePassed).length}</strong>
            </article>
          </div>
        </section>
      )}

      <DataTable
        columns={['Name', 'Check in', 'Check out', 'Status', 'Location', 'Distance', 'Hours']}
        emptyMessage="Attendance will appear after interns check in or check out."
        rows={visibleAttendanceRows}
        renderRow={(record: AttendanceRecord) => (
          <>
            <td>{record.name}</td>
            <td>{record.checkIn}</td>
            <td>{record.checkOut}</td>
            <td>
              <StatusPill status={record.status} />
            </td>
            <td>{record.location}</td>
            <td>{record.distance}</td>
            <td>{record.hours}</td>
          </>
        )}
        title={role === 'intern' ? 'My attendance today' : 'Today'}
      />
    </div>
  )
}

function TasksView({
  placements,
  role,
  session,
  setTaskItems,
  taskItems,
  triggerToast,
}: ViewProps & {
  placements: InternRecord[]
  role: RoleId
  session: LoginSession
  setTaskItems: Dispatch<SetStateAction<TaskRecord[]>>
  taskItems: TaskRecord[]
}) {
  const lanes: TaskRecord['status'][] = ['Pending', 'In Progress', 'Completed', 'Overdue', 'Rejected']
  const [composerOpen, setComposerOpen] = useState(false)
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({})
  const [submissionDrafts, setSubmissionDrafts] = useState<Record<string, string>>({})
  const assignablePlacements =
    role === 'companySupervisor'
      ? placements.filter((placement) => sameCredential(placement.company, session.organization))
      : placements
  const visibleTaskItems =
    role === 'intern'
      ? taskItems.filter((task) => taskBelongsToSession(task, session))
      : role === 'companySupervisor'
        ? taskItems.filter(
            (task) =>
              sameCredential(task.company ?? '', session.organization) ||
              assignablePlacements.some((placement) => taskBelongsToPlacement(task, placement)),
          )
      : taskItems
  const [taskDraft, setTaskDraft] = useState({
    deadline: 'Jul 05',
    intern: role === 'intern' ? session.name : '',
    priority: 'Medium' as TaskRecord['priority'],
    studentNo: '',
    title: '',
  })
  const getTaskDraftKey = (task: TaskRecord) => task.id ?? `${task.studentNo ?? task.intern}-${task.title}`
  const taskProgressForStatus = (task: TaskRecord, status: TaskRecord['status']) => {
    if (status === 'Completed') return 100
    if (status === 'Rejected') return Math.max(Number(task.progress ?? 0), 65)
    if (status === 'In Progress') return Math.max(Number(task.progress ?? 0), 50)
    return Number(task.progress ?? 0)
  }

  useEffect(() => {
    let ignored = false

    const loadTasks = async () => {
      try {
        const payload = await apiJson<{ tasks: TaskRecord[] }>('/api/tasks')
        if (!ignored) {
          setTaskItems(payload.tasks)
        }
      } catch {
        if (!ignored) {
          triggerToast('Local API unavailable; tasks will appear after the backend reconnects')
        }
      }
    }

    void loadTasks()

    return () => {
      ignored = true
    }
  }, [])

  useEffect(() => {
    if (role === 'intern' || taskDraft.studentNo || assignablePlacements.length === 0) return

    const firstPlacement = assignablePlacements[0]
    setTaskDraft((current) => ({
      ...current,
      intern: firstPlacement.name,
      studentNo: firstPlacement.studentNo,
    }))
  }, [assignablePlacements, role, taskDraft.studentNo])

  const createTask = async () => {
    const title = taskDraft.title.trim()
    if (!title) {
      triggerToast('Task title is required')
      return
    }
    const assignedPlacement =
      assignablePlacements.find((placement) => sameCredential(placement.studentNo, taskDraft.studentNo)) ??
      assignablePlacements.find((placement) => samePersonName(placement.name, taskDraft.intern)) ??
      null
    if (role !== 'intern' && !assignedPlacement) {
      triggerToast('Select an assigned intern before creating the task')
      return
    }

    const task: TaskRecord = {
      attachments: 0,
      company: assignedPlacement?.company,
      deadline: taskDraft.deadline,
      intern: assignedPlacement?.name ?? taskDraft.intern,
      priority: taskDraft.priority,
      progress: 0,
      status: 'Pending',
      studentNo: assignedPlacement?.studentNo,
      title,
      university: assignedPlacement?.university,
    }
    try {
      const payload = await apiJson<{ task: TaskRecord }>('/api/tasks', {
        body: JSON.stringify(task),
        method: 'POST',
      })
      setTaskItems((items) => [payload.task, ...items])
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Task could not be created')
      return
    }
    setTaskDraft({ deadline: 'Jul 05', intern: role === 'intern' ? session.name : '', priority: 'Medium', studentNo: '', title: '' })
    setComposerOpen(false)
    triggerToast('Task created and added to Pending')
  }

  const patchTask = async (task: TaskRecord, body: Partial<TaskRecord> & Record<string, unknown>, successMessage: string) => {
    const taskKey = task.id ?? task.title
    try {
      const payload = await apiJson<{ task: TaskRecord }>(`/api/tasks/${encodeURIComponent(taskKey)}`, {
        body: JSON.stringify(body),
        method: 'PATCH',
      })
      setTaskItems((items) =>
        items.map((item) =>
          (item.id && payload.task.id && item.id === payload.task.id) || (!item.id && item.title === task.title)
            ? payload.task
            : item,
        ),
      )
      triggerToast(successMessage)
      return payload.task
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Task could not be updated')
      return null
    }
  }

  const updateTaskStatus = async (task: TaskRecord, status: TaskRecord['status']) => {
    await patchTask(task, { progress: taskProgressForStatus(task, status), status }, `Task moved to ${status}`)
  }

  const submitTaskForReview = async (task: TaskRecord) => {
    const taskKey = getTaskDraftKey(task)
    const submissionNote = (submissionDrafts[taskKey] ?? '').trim()
    if (!submissionNote) {
      triggerToast('Add a short work summary before submitting')
      return
    }

    const updatedTask = await patchTask(
      task,
      {
        attachments: 0,
        action: 'submit',
        progress: Math.max(Number(task.progress ?? 0), 90),
        status: 'In Progress',
        submissionNote,
      },
      'Task sent to company supervisor for approval',
    )
    if (updatedTask) {
      setSubmissionDrafts((current) => {
        const next = { ...current }
        delete next[taskKey]
        return next
      })
    }
  }

  const reviewTask = async (task: TaskRecord, status: 'Completed' | 'Rejected') => {
    const taskKey = getTaskDraftKey(task)
    const reviewComment = (reviewDrafts[taskKey] ?? '').trim()

    const updatedTask = await patchTask(
      task,
      {
        progress: taskProgressForStatus(task, status),
        reviewComment,
        status,
      },
      status === 'Completed' ? 'Task approved; intern will see it under Completed' : 'Task rejected; intern can submit again',
    )
    if (updatedTask) {
      setReviewDrafts((current) => {
        const next = { ...current }
        delete next[taskKey]
        return next
      })
    }
  }

  if (role === 'companySupervisor') {
    const reviewTasks = visibleTaskItems.filter((task) => taskAwaitingCompanyApproval(task))
    const activeTasks = visibleTaskItems.filter(
      (task) => !taskAwaitingCompanyApproval(task) && ['Pending', 'In Progress', 'Overdue'].includes(taskBoardStatus(task)),
    )
    const completedTasks = visibleTaskItems.filter((task) => task.status === 'Completed')
    const rejectedTasks = visibleTaskItems.filter((task) => taskBoardStatus(task) === 'Rejected')

    return (
      <div className="module-stack">
        <div className="module-header">
          <div>
            <span className="eyebrow-text">Review queue, assignments, approval decisions</span>
            <h2>Company task approvals</h2>
          </div>
          <button className="primary-button" onClick={() => setComposerOpen((value) => !value)} type="button">
            <Plus size={17} aria-hidden="true" />
            <span>New task</span>
          </button>
        </div>

        {composerOpen && (
          <section className="panel">
            <PanelHeader icon={Plus} title="Create task" />
            <div className="form-grid">
              <label>
                <span>Task title</span>
                <input
                  onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Enter task title"
                  value={taskDraft.title}
                />
              </label>
              <label>
                <span>Intern</span>
                <select
                  onChange={(event) => {
                    const placement = assignablePlacements.find((item) => sameCredential(item.studentNo, event.target.value))
                    setTaskDraft((current) => ({
                      ...current,
                      intern: placement?.name ?? '',
                      studentNo: placement?.studentNo ?? '',
                    }))
                  }}
                  value={taskDraft.studentNo}
                >
                  {assignablePlacements.length === 0 ? (
                    <option value="">No assigned interns</option>
                  ) : (
                    assignablePlacements.map((placement) => (
                      <option key={placement.studentNo} value={placement.studentNo}>
                        {placement.name} ({placement.studentNo})
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label>
                <span>Deadline</span>
                <input
                  onChange={(event) => setTaskDraft((current) => ({ ...current, deadline: event.target.value }))}
                  value={taskDraft.deadline}
                />
              </label>
              <label>
                <span>Priority</span>
                <select
                  onChange={(event) =>
                    setTaskDraft((current) => ({ ...current, priority: event.target.value as TaskRecord['priority'] }))
                  }
                  value={taskDraft.priority}
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>
            </div>
            <div className="button-row">
              <button className="primary-button" onClick={createTask} type="button">
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>Create task</span>
              </button>
              <button className="secondary-button" onClick={() => setComposerOpen(false)} type="button">
                Cancel
              </button>
            </div>
          </section>
        )}

        <div className="task-supervisor-metrics">
          <article>
            <span>Waiting approval</span>
            <strong>{reviewTasks.length}</strong>
            <small>Submitted summaries</small>
          </article>
          <article>
            <span>Active work</span>
            <strong>{activeTasks.length}</strong>
            <small>Pending or in progress</small>
          </article>
          <article>
            <span>Completed</span>
            <strong>{completedTasks.length}</strong>
            <small>Approved tasks</small>
          </article>
          <article>
            <span>Rejected</span>
            <strong>{rejectedTasks.length}</strong>
            <small>Sent back to interns</small>
          </article>
        </div>

        <section className="panel supervisor-review-panel">
          <PanelHeader icon={ClipboardCheck} title="Work summaries waiting for approval" />
          {reviewTasks.length === 0 ? (
            <div className="lane-empty">
              <span>No submitted work summaries waiting for approval</span>
            </div>
          ) : (
            <div className="review-queue">
              {reviewTasks.map((task) => {
                const taskKey = getTaskDraftKey(task)
                const reviewDraft = reviewDrafts[taskKey] ?? ''

                return (
                  <article className="review-card" key={task.id ?? task.title}>
                    <div className="review-card-header">
                      <div>
                        <span>{task.intern}</span>
                        <h3>{task.title}</h3>
                      </div>
                      <StatusPill status={task.priority} />
                    </div>
                    <div className="review-meta">
                      <span>Due {task.deadline}</span>
                      {task.submittedAt && <span>Submitted {task.submittedAt}</span>}
                    </div>
                    <div className="task-note">
                      <strong>Work summary</strong>
                      <span>{task.submissionNote ?? 'No summary provided'}</span>
                    </div>
                    <label className="review-comment-box">
                      <span>Review comment</span>
                      <textarea
                        onChange={(event) =>
                          setReviewDrafts((current) => ({
                            ...current,
                            [taskKey]: event.target.value,
                          }))
                        }
                        placeholder="Optional note for the intern"
                        rows={3}
                        value={reviewDraft}
                      />
                    </label>
                    <div className="task-actions">
                      <button className="primary-button" onClick={() => reviewTask(task, 'Completed')} type="button">
                        <CheckCircle2 size={15} aria-hidden="true" />
                        <span>Approve</span>
                      </button>
                      <button className="secondary-button" onClick={() => reviewTask(task, 'Rejected')} type="button">
                        <AlertTriangle size={15} aria-hidden="true" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="panel">
          <PanelHeader icon={ClipboardList} title="Assigned task progress" />
          {visibleTaskItems.length === 0 ? (
            <div className="lane-empty">
              <span>No assigned tasks yet</span>
            </div>
          ) : (
            <div className="supervisor-task-list">
              {visibleTaskItems.map((task) => {
                const awaitingApproval = taskAwaitingCompanyApproval(task)
                const visibleStatus = awaitingApproval ? 'Waiting approval' : taskBoardStatus(task)

                return (
                  <article className="supervisor-task-row" key={task.id ?? `${task.intern}-${task.title}`}>
                    <div>
                      <strong>{task.title}</strong>
                      <span>{task.intern}</span>
                    </div>
                    <StatusPill status={visibleStatus} />
                    <span>{task.deadline}</span>
                    <ProgressBar value={task.progress} />
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="module-stack">
      <div className="module-header">
        <div>
          <span className="eyebrow-text">Priorities, deadlines, attachments, approval flow</span>
          <h2>{role === 'intern' ? 'My assigned tasks' : 'Task management'}</h2>
        </div>
        {role !== 'intern' && (
          <button className="primary-button" onClick={() => setComposerOpen((value) => !value)} type="button">
            <Plus size={17} aria-hidden="true" />
            <span>New task</span>
          </button>
        )}
      </div>

      {composerOpen && role !== 'intern' && (
        <section className="panel">
          <PanelHeader icon={Plus} title="Create task" />
          <div className="form-grid">
            <label>
              <span>Task title</span>
              <input
                onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Enter task title"
                value={taskDraft.title}
              />
            </label>
            <label>
              <span>Intern</span>
              <select
                onChange={(event) => {
                  const placement = assignablePlacements.find((item) => sameCredential(item.studentNo, event.target.value))
                  setTaskDraft((current) => ({
                    ...current,
                    intern: placement?.name ?? '',
                    studentNo: placement?.studentNo ?? '',
                  }))
                }}
                value={taskDraft.studentNo}
              >
                {assignablePlacements.length === 0 ? (
                  <option value="">No assigned interns</option>
                ) : (
                  assignablePlacements.map((placement) => (
                    <option key={placement.studentNo} value={placement.studentNo}>
                      {placement.name} ({placement.studentNo})
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              <span>Deadline</span>
              <input
                onChange={(event) => setTaskDraft((current) => ({ ...current, deadline: event.target.value }))}
                value={taskDraft.deadline}
              />
            </label>
            <label>
              <span>Priority</span>
              <select
                onChange={(event) =>
                  setTaskDraft((current) => ({ ...current, priority: event.target.value as TaskRecord['priority'] }))
                }
                value={taskDraft.priority}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
          </div>
          <div className="button-row">
            <button className="primary-button" onClick={createTask} type="button">
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>Create task</span>
            </button>
            <button className="secondary-button" onClick={() => setComposerOpen(false)} type="button">
              Cancel
            </button>
          </div>
        </section>
      )}

      <div className="kanban">
        {lanes.map((lane) => (
          <section className="lane" key={lane}>
            <div className="lane-header">
              <h3>{lane}</h3>
              <span>{visibleTaskItems.filter((task) => taskBoardStatus(task) === lane).length}</span>
            </div>
            {visibleTaskItems
              .filter((task) => taskBoardStatus(task) === lane)
              .map((task) => {
                const taskKey = getTaskDraftKey(task)
                const submissionDraft = submissionDrafts[taskKey] ?? ''
                const reviewDraft = reviewDrafts[taskKey] ?? ''
                const awaitingApproval = taskAwaitingCompanyApproval(task)
                const canSubmitTask =
                  role === 'intern' &&
                  !awaitingApproval &&
                  ['In Progress', 'Overdue', 'Needs correction', 'Rejected'].includes(task.status)
                const canReviewTask = ['admin', 'companySupervisor'].includes(role) && awaitingApproval

                return (
                  <article className="task-card" key={task.id ?? task.title}>
                    <div className="task-top">
                      <StatusPill status={task.priority} />
                      <span>{task.deadline}</span>
                    </div>
                    <h4>{task.title}</h4>
                    <p>{task.intern}</p>
                    <ProgressBar value={task.progress} />
                    <div className="task-meta">
                      <span>{task.progress}%</span>
                      <span>
                        <Paperclip size={14} aria-hidden="true" />
                        {task.attachments}
                      </span>
                    </div>
                    {task.submissionNote && (
                      <div className="task-note">
                        <strong>Work summary</strong>
                        <span>{task.submissionNote}</span>
                        {task.submittedAt && <small>{task.submittedAt}</small>}
                      </div>
                    )}
                    {(task.reviewComment || task.reviewedBy) && (
                      <div className="task-note review-note">
                        <strong>Supervisor review</strong>
                        {task.reviewComment && <span>{task.reviewComment}</span>}
                        {task.reviewedBy && <small>{task.reviewedBy}</small>}
                      </div>
                    )}
                    {canSubmitTask && (
                      <div className="task-submission">
                        <label>
                          <span>Work summary</span>
                          <textarea
                            onChange={(event) =>
                              setSubmissionDrafts((current) => ({
                                ...current,
                                [taskKey]: event.target.value,
                              }))
                            }
                            placeholder="Summarize what you completed"
                            rows={3}
                            value={submissionDraft}
                          />
                        </label>
                      </div>
                    )}
                    {canReviewTask && (
                      <div className="task-submission">
                        <label>
                          <span>Review comment</span>
                          <textarea
                            onChange={(event) =>
                              setReviewDrafts((current) => ({
                                ...current,
                                [taskKey]: event.target.value,
                              }))
                            }
                            placeholder="Optional note for the intern"
                            rows={3}
                            value={reviewDraft}
                          />
                        </label>
                      </div>
                    )}
                    <div className="task-actions">
                      {role === 'intern' && task.status === 'Pending' && (
                        <button className="secondary-button" onClick={() => updateTaskStatus(task, 'In Progress')} type="button">
                          <Clock size={15} aria-hidden="true" />
                          <span>Start</span>
                        </button>
                      )}
                      {canSubmitTask && (
                        <button className="primary-button" onClick={() => submitTaskForReview(task)} type="button">
                          <Send size={15} aria-hidden="true" />
                          <span>Submit for review</span>
                        </button>
                      )}
                      {role === 'intern' && awaitingApproval && (
                        <span className="task-state-note">Waiting for company supervisor approval</span>
                      )}
                      {canReviewTask && (
                        <>
                          <button className="primary-button" onClick={() => reviewTask(task, 'Completed')} type="button">
                            <CheckCircle2 size={15} aria-hidden="true" />
                            <span>Approve</span>
                          </button>
                          <button className="secondary-button" onClick={() => reviewTask(task, 'Rejected')} type="button">
                            <AlertTriangle size={15} aria-hidden="true" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            {visibleTaskItems.filter((task) => taskBoardStatus(task) === lane).length === 0 && (
              <div className="lane-empty">
                <span>No {lane.toLowerCase()} tasks</span>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

interface InternshipReportDraft {
  activities: string
  challenges: string
  company: string
  department: string
  hoursWorked: string
  nextPlan: string
  periodEnd: string
  periodStart: string
  skillsLearned: string
  studentName: string
  studentNo: string
  university: string
}

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10)

const createReportDraft = (session: LoginSession, placement?: InternRecord | null): InternshipReportDraft => {
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd)

  return {
    activities: '',
    challenges: '',
    company: placement?.company ?? '',
    department: placement?.department ?? '',
    hoursWorked: '',
    nextPlan: '',
    periodEnd: formatDateInput(periodEnd),
    periodStart: formatDateInput(periodStart),
    skillsLearned: '',
    studentName: placement?.name ?? session.name,
    studentNo: placement?.studentNo ?? session.loginId,
    university: placement?.university ?? session.organization,
  }
}

function ReportsView({
  placements,
  reportItems,
  role,
  session,
  setReportItems,
  triggerToast,
}: ViewProps & {
  placements: InternRecord[]
  reportItems: ReportRecord[]
  role: RoleId
  session: LoginSession
  setReportItems: Dispatch<SetStateAction<ReportRecord[]>>
}) {
  const assignedPlacement = useMemo(
    () =>
      placements.find((placement) => sameCredential(placement.studentNo, session.loginId)) ??
      placements.find((placement) => samePersonName(placement.name, session.name)) ??
      null,
    [placements, session.loginId, session.name],
  )
  const [reportDraft, setReportDraft] = useState<InternshipReportDraft>(() => createReportDraft(session, assignedPlacement))
  const canSubmitReport = role === 'intern'
  const reportQueueTitle =
    role === 'companySupervisor'
      ? 'Company approval queue'
      : role === 'universitySupervisor'
        ? 'University approval queue'
        : role === 'intern'
          ? 'My submitted reports'
          : 'Report workflow'
  const reportEmptyMessage =
    role === 'companySupervisor'
      ? 'Reports submitted by interns at your company will appear here for approval.'
      : role === 'universitySupervisor'
        ? 'Reports approved by company supervisors will appear here for university review.'
        : role === 'intern'
          ? 'Your submitted reports will appear here.'
          : 'Submitted reports will appear here.'

  const reportVisibleToRole = (report: ReportRecord) => {
    if (role === 'admin') return true
    if (role === 'intern') {
      return sameCredential(report.studentNo ?? '', session.loginId) || samePersonName(report.owner, session.name)
    }
    if (role === 'companySupervisor') {
      return sameCredential(report.company ?? '', session.organization)
    }
    if (role === 'universitySupervisor') {
      return sameCredential(report.university ?? '', session.organization)
    }

    return false
  }

  useEffect(() => {
    let ignored = false

    const loadReports = async () => {
      try {
        const params = new URLSearchParams({
          loginId: session.loginId,
          name: session.name,
          organization: session.organization,
          role,
        })
        const payload = await apiJson<{ reports: ReportRecord[] }>(`/api/reports?${params.toString()}`)

        if (!ignored) {
          setReportItems(payload.reports)
        }
      } catch {
        if (!ignored) {
          triggerToast('Local API unavailable; reports will sync when the backend reconnects')
        }
      }
    }

    void loadReports()

    return () => {
      ignored = true
    }
  }, [role, session.loginId, session.name, session.organization, setReportItems])

  useEffect(() => {
    if (!assignedPlacement) return

    setReportDraft((current) => ({
      ...current,
      company: current.company || assignedPlacement.company,
      department: current.department || assignedPlacement.department,
      studentName: current.studentName || assignedPlacement.name,
      studentNo: current.studentNo || assignedPlacement.studentNo,
      university: current.university || assignedPlacement.university,
    }))
  }, [assignedPlacement])

  const updateReportDraft = (field: keyof InternshipReportDraft, value: string) => {
    setReportDraft((current) => ({ ...current, [field]: value }))
  }

  const reportContent = [
    'INTERNSHIP DAILY REPORT',
    '',
    '1. Student Details',
    `Student name: ${reportDraft.studentName || '-'}`,
    `Student number: ${reportDraft.studentNo || '-'}`,
    `University: ${reportDraft.university || '-'}`,
    '',
    '2. Placement Details',
    `Company/organization: ${reportDraft.company || '-'}`,
    `Department/unit: ${reportDraft.department || '-'}`,
    `Report date: ${reportDraft.periodEnd || reportDraft.periodStart || '-'}`,
    `Hours worked: ${reportDraft.hoursWorked || '-'}`,
    '',
    '3. Work Done During The Period',
    reportDraft.activities || '-',
    '',
    '4. Skills And Knowledge Gained',
    reportDraft.skillsLearned || '-',
    '',
    '5. Challenges Encountered',
    reportDraft.challenges || '-',
    '',
    '6. Plan For The Next Working Day',
    reportDraft.nextPlan || '-',
    '',
    'Declaration: I confirm that the information provided in this report is accurate.',
  ].join('\n')

  const downloadReport = () => {
    downloadTextFile(
      `internship-report-${reportDraft.studentNo || 'student'}-${reportDraft.periodEnd || 'period'}.txt`,
      reportContent,
    )
    triggerToast('Formatted internship report downloaded')
  }

  const submitReport = async () => {
    if (!reportDraft.activities.trim() || !reportDraft.skillsLearned.trim() || !reportDraft.nextPlan.trim()) {
      triggerToast('Add work done, skills learned, and next plan before submitting')
      return
    }

    const submittedReport: ReportRecord = {
      company: reportDraft.company,
      content: reportContent,
      department: reportDraft.department,
      hoursWorked: reportDraft.hoursWorked,
      id: `REP-${Date.now()}`,
      owner: reportDraft.studentName || session.name,
      periodEnd: reportDraft.periodEnd,
      periodStart: reportDraft.periodStart,
      reviewer: 'Company Supervisor',
      status: 'Pending company approval',
      studentNo: reportDraft.studentNo || session.loginId,
      submitted: new Date().toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }),
      title: `Daily internship report ${reportDraft.periodEnd}`,
      type: 'Daily report',
      university: reportDraft.university,
    }

    try {
      const payload = await apiJson<{ report: ReportRecord }>('/api/reports', {
        body: JSON.stringify(submittedReport),
        method: 'POST',
      })
      setReportItems((items) => [payload.report, ...items])
      triggerToast('Report submitted to company supervisor for approval')
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Report could not be submitted')
    }
  }

  const downloadSubmittedReport = (report: ReportRecord) => {
    downloadTextFile(
      `internship-report-${report.studentNo ?? 'student'}-${report.periodEnd ?? 'period'}.txt`,
      report.content ?? report.title,
    )
    triggerToast('Report downloaded')
  }

  const updateReportInQueue = (updatedReport: ReportRecord) => {
    setReportItems((items) => {
      const nextItems = items.filter((item) => item.id !== updatedReport.id)
      return reportVisibleToRole(updatedReport) ? [updatedReport, ...nextItems] : nextItems
    })
  }

  const approveReport = async (report: ReportRecord) => {
    if (!report.id) {
      triggerToast('This report needs to sync before approval')
      return
    }

    try {
      const payload = await apiJson<{ report: ReportRecord }>(`/api/reports/${encodeURIComponent(report.id)}/approve`, {
        body: JSON.stringify({}),
        method: 'PATCH',
      })
      updateReportInQueue(payload.report)
      triggerToast(
        role === 'companySupervisor'
          ? 'Report approved and sent to the university supervisor'
          : 'Report approved by university supervisor',
      )
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Report approval failed')
    }
  }

  return (
    <div className="module-stack">
      <div className="module-header">
        <div>
          <span className="eyebrow-text">Daily report, company approval, university review</span>
          <h2>{canSubmitReport ? 'Daily report format' : reportQueueTitle}</h2>
        </div>
        {canSubmitReport && (
          <div className="button-row">
            <button className="secondary-button" onClick={downloadReport} type="button">
              <Download size={17} aria-hidden="true" />
              <span>Download</span>
            </button>
            <button className="primary-button" onClick={submitReport} type="button">
              <CheckCircle2 size={17} aria-hidden="true" />
              <span>Submit</span>
            </button>
          </div>
        )}
      </div>

      {canSubmitReport ? (
        <div className="split-grid">
          <section className="panel">
            <PanelHeader icon={FileSpreadsheet} title="Report details" />
            <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
              <label>
                <span>Student name</span>
                <input value={reportDraft.studentName} onChange={(event) => updateReportDraft('studentName', event.target.value)} />
              </label>
              <label>
                <span>Student number</span>
                <input value={reportDraft.studentNo} onChange={(event) => updateReportDraft('studentNo', event.target.value)} />
              </label>
              <label>
                <span>University</span>
                <input value={reportDraft.university} onChange={(event) => updateReportDraft('university', event.target.value)} />
              </label>
              <label>
                <span>Company/organization</span>
                <input value={reportDraft.company} onChange={(event) => updateReportDraft('company', event.target.value)} />
              </label>
              <label>
                <span>Department/unit</span>
                <input value={reportDraft.department} onChange={(event) => updateReportDraft('department', event.target.value)} />
              </label>
              <label>
                <span>Hours worked</span>
                <input value={reportDraft.hoursWorked} onChange={(event) => updateReportDraft('hoursWorked', event.target.value)} />
              </label>
              <label>
                <span>Report date</span>
                <input
                  type="date"
                  value={reportDraft.periodEnd}
                  onChange={(event) => {
                    updateReportDraft('periodEnd', event.target.value)
                    updateReportDraft('periodStart', event.target.value)
                  }}
                />
              </label>
              <label>
                <span>Work done</span>
                <textarea value={reportDraft.activities} onChange={(event) => updateReportDraft('activities', event.target.value)} />
              </label>
              <label>
                <span>Skills learned</span>
                <textarea value={reportDraft.skillsLearned} onChange={(event) => updateReportDraft('skillsLearned', event.target.value)} />
              </label>
              <label>
                <span>Challenges</span>
                <textarea value={reportDraft.challenges} onChange={(event) => updateReportDraft('challenges', event.target.value)} />
              </label>
              <label>
                <span>Next plan</span>
                <textarea value={reportDraft.nextPlan} onChange={(event) => updateReportDraft('nextPlan', event.target.value)} />
              </label>
            </form>
          </section>

          <section className="panel">
            <PanelHeader icon={FileText} title="Formatted preview" />
            <pre className="report-preview">{reportContent}</pre>
          </section>
        </div>
      ) : (
        <section className="panel">
          <PanelHeader icon={FileSpreadsheet} title={reportQueueTitle} />
          <div className="document-note">
            <strong>
              {role === 'companySupervisor'
                ? 'Approve company reports only'
                : role === 'universitySupervisor'
                  ? 'Review reports after company approval'
                  : 'Full report workflow'}
            </strong>
            <p>
              {role === 'companySupervisor'
                ? 'When you approve a submitted intern report, it moves to the university supervisor and remains in your report history.'
                : role === 'universitySupervisor'
                  ? 'Reports approved by company supervisors appear here and remain stored after university approval.'
                  : 'Administrators can monitor every submitted report and its current approval stage.'}
            </p>
          </div>
        </section>
      )}

      <DataTable
        columns={['Title', 'Student', 'Company', 'University', 'Period', 'Submitted', 'Status', 'Reviewer', 'Action']}
        emptyMessage={reportEmptyMessage}
        rows={reportItems}
        renderRow={(report: ReportRecord) => (
          <>
            <td>{report.title}</td>
            <td>{report.owner}</td>
            <td>{report.company ?? '-'}</td>
            <td>{report.university ?? '-'}</td>
            <td>{report.periodStart && report.periodEnd ? `${report.periodStart} to ${report.periodEnd}` : report.submitted}</td>
            <td>{report.submitted}</td>
            <td>
              <StatusPill status={report.status} />
            </td>
            <td>{report.reviewer}</td>
            <td>
              <div className="table-actions">
                <button className="secondary-button table-action" onClick={() => downloadSubmittedReport(report)} type="button">
                  <Download size={15} aria-hidden="true" />
                  <span>Download</span>
                </button>
                {role === 'companySupervisor' && report.status === 'Pending company approval' && (
                  <button className="primary-button table-action" onClick={() => approveReport(report)} type="button">
                    <CheckCircle2 size={15} aria-hidden="true" />
                    <span>Approve</span>
                  </button>
                )}
                {role === 'universitySupervisor' && report.status === 'Pending university approval' && (
                  <button className="primary-button table-action" onClick={() => approveReport(report)} type="button">
                    <CheckCircle2 size={15} aria-hidden="true" />
                    <span>Approve</span>
                  </button>
                )}
              </div>
            </td>
          </>
        )}
        title={reportQueueTitle}
      />
    </div>
  )
}

function AnalyticsView({
  attendanceEvents,
  placements,
  reportItems,
  taskItems,
}: {
  attendanceEvents: AttendanceEventRecord[]
  placements: InternRecord[]
  reportItems: ReportRecord[]
  taskItems: TaskRecord[]
}) {
  const programTrend = useMemo(
    () => buildProgramTrend(attendanceEvents, taskItems, reportItems, placements),
    [attendanceEvents, placements, reportItems, taskItems],
  )
  const taskMixEntries = useMemo(() => buildTaskMix(taskItems), [taskItems])
  const taskCompletion = calculateTaskCompletionRate(taskItems)
  const departmentPerformance = useMemo(() => buildDepartmentStats(placements, taskItems), [placements, taskItems])

  return (
    <div className="dashboard-grid">
      <section className="panel wide-panel">
        <PanelHeader icon={BarChart3} title="Department performance" />
        <div className="chart-area">
          <BarComparisonChart data={departmentPerformance} />
        </div>
      </section>

      <section className="panel">
        <PanelHeader icon={ClipboardCheck} title="Task completion mix" />
        <div className="donut-area">
          <DonutChart completion={taskCompletion} data={taskMixEntries} />
        </div>
        <div className="legend-list">
          {taskMixEntries.map((entry) => (
            <span key={entry.name}>
              <i style={{ background: entry.color }} />
              {entry.name}: {entry.value}
            </span>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelHeader icon={LineChart} title="Completion rates" />
        <div className="chart-area short">
          <TrendChart
            colorA="#7c55c7"
            colorB="#d95f43"
            data={programTrend}
            labelA="Tasks"
            labelB="Reports"
            seriesA="tasks"
            seriesB="reports"
          />
        </div>
      </section>
    </div>
  )
}

interface ManualEvaluationRecord {
  attendanceScore: number
  comments: string
  communicationScore: number
  company: string
  createdAt: string
  evaluatedBy: string
  id: string
  initiativeScore: number
  internName: string
  overallScore: number
  professionalismScore: number
  studentNo: string
  technicalScore: number
  teamworkScore: number
  university: string
}

const manualEvaluationFields: Array<{
  field: keyof Pick<
    ManualEvaluationRecord,
    'professionalismScore' | 'technicalScore' | 'communicationScore' | 'teamworkScore' | 'initiativeScore'
  >
  label: string
}> = [
  { field: 'professionalismScore', label: 'Professionalism' },
  { field: 'technicalScore', label: 'Technical skill' },
  { field: 'communicationScore', label: 'Communication' },
  { field: 'teamworkScore', label: 'Teamwork' },
  { field: 'initiativeScore', label: 'Initiative' },
]

const calculateManualOverall = (draft: Pick<
  ManualEvaluationRecord,
  'professionalismScore' | 'technicalScore' | 'communicationScore' | 'teamworkScore' | 'initiativeScore'
>) =>
  Math.round(
    (draft.professionalismScore +
      draft.technicalScore +
      draft.communicationScore +
      draft.teamworkScore +
      draft.initiativeScore) /
      5,
  )

function EvaluationsView({
  manualEvaluations,
  placements,
  role,
  session,
  setManualEvaluations,
  triggerToast,
}: ViewProps & {
  manualEvaluations: ManualEvaluationRecord[]
  placements: InternRecord[]
  role: RoleId
  session: LoginSession
  setManualEvaluations: Dispatch<SetStateAction<ManualEvaluationRecord[]>>
}) {
  const companyPlacements = placements.filter((placement) => sameCredential(placement.company, session.organization))
  const evaluationPlacements = role === 'companySupervisor' ? companyPlacements : placements
  const firstPlacement = evaluationPlacements[0] ?? null
  const [selectedStudentNo, setSelectedStudentNo] = useState(firstPlacement?.studentNo ?? '')
  const selectedPlacement =
    evaluationPlacements.find((placement) => sameCredential(placement.studentNo, selectedStudentNo)) ??
    firstPlacement
  const [evaluationDraft, setEvaluationDraft] = useState({
    comments: '',
    communicationScore: 70,
    initiativeScore: 70,
    professionalismScore: 70,
    teamworkScore: 70,
    technicalScore: 70,
  })
  const manualOverall = calculateManualOverall(evaluationDraft)

  useEffect(() => {
    let ignored = false

    const loadEvaluations = async () => {
      try {
        const params = new URLSearchParams({
          loginId: session.loginId,
          name: session.name,
          organization: session.organization,
          role,
        })
        const payload = await apiJson<{ evaluations: ManualEvaluationRecord[] }>(`/api/evaluations?${params.toString()}`)

        if (!ignored) {
          setManualEvaluations(payload.evaluations)
        }
      } catch {
        if (!ignored) {
          triggerToast('Local API unavailable; evaluations will sync when backend reconnects')
        }
      }
    }

    void loadEvaluations()

    return () => {
      ignored = true
    }
  }, [role, session.loginId, session.name, session.organization, setManualEvaluations])

  useEffect(() => {
    if (!selectedStudentNo && firstPlacement) {
      setSelectedStudentNo(firstPlacement.studentNo)
    }
  }, [firstPlacement, selectedStudentNo])

  const updateEvaluationScore = (field: keyof typeof evaluationDraft, value: string) => {
    if (field === 'comments') {
      setEvaluationDraft((current) => ({ ...current, comments: value }))
      return
    }

    const score = Math.min(100, Math.max(0, Math.round(Number(value) || 0)))
    setEvaluationDraft((current) => ({ ...current, [field]: score }))
  }

  const submitEvaluation = async () => {
    if (!selectedPlacement) {
      triggerToast('No assigned intern found for evaluation')
      return
    }

    const evaluation: ManualEvaluationRecord = {
      attendanceScore: selectedPlacement.attendance,
      comments: evaluationDraft.comments.trim() || 'No supervisor comment added.',
      communicationScore: evaluationDraft.communicationScore,
      company: selectedPlacement.company,
      createdAt: new Date().toLocaleString(),
      evaluatedBy: session.name,
      id: `EVAL-${Date.now()}`,
      initiativeScore: evaluationDraft.initiativeScore,
      internName: selectedPlacement.name,
      overallScore: manualOverall,
      professionalismScore: evaluationDraft.professionalismScore,
      studentNo: selectedPlacement.studentNo,
      technicalScore: evaluationDraft.technicalScore,
      teamworkScore: evaluationDraft.teamworkScore,
      university: selectedPlacement.university,
    }

    try {
      const payload = await apiJson<{ evaluation: ManualEvaluationRecord }>('/api/evaluations', {
        body: JSON.stringify(evaluation),
        method: 'POST',
      })
      setManualEvaluations((items) => [payload.evaluation, ...items])
      triggerToast('Manual supervisor evaluation saved')
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Evaluation could not be saved')
    }
  }

  const downloadEvaluation = () => {
    const content = manualEvaluations
      .map((evaluation) =>
        [
          'Intern Nexus Manual Evaluation',
          `Intern: ${evaluation.internName}`,
          `Student number: ${evaluation.studentNo}`,
          `Company: ${evaluation.company}`,
          `University: ${evaluation.university}`,
          `Attendance (system): ${evaluation.attendanceScore}%`,
          `Professionalism: ${evaluation.professionalismScore}%`,
          `Technical skill: ${evaluation.technicalScore}%`,
          `Communication: ${evaluation.communicationScore}%`,
          `Teamwork: ${evaluation.teamworkScore}%`,
          `Initiative: ${evaluation.initiativeScore}%`,
          `Manual overall: ${evaluation.overallScore}%`,
          `Comment: ${evaluation.comments}`,
          `Evaluated by: ${evaluation.evaluatedBy}`,
          `Date: ${evaluation.createdAt}`,
        ].join('\n'),
      )
      .join('\n\n---\n\n')

    downloadTextFile('intern-nexus-manual-evaluations.txt', content || 'No manual evaluations saved yet.')
    triggerToast('Evaluation file downloaded')
  }

  return (
    <div className="module-stack">
      <div className="module-header">
        <div>
          <span className="eyebrow-text">Manual supervisor scoring plus automatic attendance</span>
          <h2>{role === 'companySupervisor' ? 'Manual intern evaluation' : 'Performance evaluations'}</h2>
        </div>
        <button className="primary-button" onClick={downloadEvaluation} type="button">
          <Download size={17} aria-hidden="true" />
          <span>Download</span>
        </button>
      </div>

      {role === 'companySupervisor' && (
        <section className="panel evaluation-panel">
          <div className="score-circle">
            <strong>{manualOverall}%</strong>
            <span>Manual score</span>
          </div>
          <div className="criteria-list">
            <label className="criterion">
              <div>
                <strong>Intern</strong>
                <span>Only interns assigned to {session.organization}</span>
              </div>
              <select value={selectedStudentNo} onChange={(event) => setSelectedStudentNo(event.target.value)}>
                {evaluationPlacements.length === 0 ? (
                  <option value="">No assigned interns</option>
                ) : (
                  evaluationPlacements.map((placement) => (
                    <option key={placement.studentNo} value={placement.studentNo}>
                      {placement.name} ({placement.studentNo})
                    </option>
                  ))
                )}
              </select>
            </label>
            <div className="criterion">
              <div>
                <strong>Attendance</strong>
                <span>System-managed, not manually edited</span>
              </div>
              <ProgressBar value={selectedPlacement?.attendance ?? 0} />
              <b>{selectedPlacement?.attendance ?? 0}%</b>
            </div>
            {manualEvaluationFields.map((field) => (
              <label className="criterion" key={field.field}>
                <div>
                  <strong>{field.label}</strong>
                  <span>Manual supervisor score</span>
                </div>
                <input
                  max={100}
                  min={0}
                  onChange={(event) => updateEvaluationScore(field.field, event.target.value)}
                  type="number"
                  value={evaluationDraft[field.field]}
                />
              </label>
            ))}
            <label className="criterion">
              <div>
                <strong>Supervisor comments</strong>
                <span>Manual observation</span>
              </div>
              <textarea
                onChange={(event) => updateEvaluationScore('comments', event.target.value)}
                placeholder="Write strengths, weaknesses, conduct, and improvement areas..."
                value={evaluationDraft.comments}
              />
            </label>
            <button className="primary-button" onClick={submitEvaluation} type="button">
              <CheckCircle2 size={17} aria-hidden="true" />
              <span>Save evaluation</span>
            </button>
          </div>
        </section>
      )}

      <DataTable
        columns={['Intern', 'Company', 'Attendance', 'Manual score', 'Evaluated by', 'Date', 'Comment']}
        emptyMessage={
          role === 'companySupervisor'
            ? 'Manual evaluations you create for assigned interns will appear here.'
            : 'Company supervisor evaluations will appear here after they are submitted.'
        }
        renderRow={(evaluation: ManualEvaluationRecord) => (
          <>
            <td>{evaluation.internName}</td>
            <td>{evaluation.company}</td>
            <td>{evaluation.attendanceScore}%</td>
            <td>
              <strong>{evaluation.overallScore}%</strong>
            </td>
            <td>{evaluation.evaluatedBy}</td>
            <td>{evaluation.createdAt}</td>
            <td>{evaluation.comments}</td>
          </>
        )}
        rows={manualEvaluations}
        title="Saved manual evaluations"
      />
    </div>
  )
}

function ComplaintsView({
  complaintItems,
  role,
  session,
  setComplaintItems,
  triggerToast,
}: ViewProps & {
  complaintItems: ComplaintRecord[]
  role: RoleId
  session: LoginSession
  setComplaintItems: Dispatch<SetStateAction<ComplaintRecord[]>>
}) {
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [category, setCategory] = useState<ComplaintRecord['category']>('Workplace')
  const complaintAudience =
    role === 'intern'
      ? 'Company Supervisor'
      : role === 'companySupervisor'
        ? category === 'System'
          ? 'Administrator'
          : 'University Supervisor'
        : 'Administrator'
  const visibleComplaints =
    role === 'admin'
      ? complaintItems
      : role === 'intern'
        ? complaintItems.filter((item) => samePersonName(item.submittedBy, session.name))
        : role === 'companySupervisor'
          ? complaintItems.filter(
              (item) => item.audience === 'Company Supervisor' || samePersonName(item.submittedBy, session.name),
            )
          : complaintItems.filter(
              (item) => item.audience === 'University Supervisor' || samePersonName(item.submittedBy, session.name),
            )

  const submitComplaint = async () => {
    if (!title.trim()) {
      triggerToast('Complaint title is required')
      return
    }

    const complaintDraft: {
      audience: ComplaintRecord['audience']
      category: ComplaintRecord['category']
      comment: string
      priority: ComplaintRecord['priority']
      submittedBy: string
      title: string
    } = {
      audience: complaintAudience,
      category,
      comment: comment.trim() || 'Waiting for review.',
      priority: category === 'System' ? 'High' : 'Medium',
      submittedBy: session.name,
      title: title.trim(),
    }
    try {
      const payload = await apiJson<{ complaint: ComplaintRecord }>('/api/complaints', {
        body: JSON.stringify(complaintDraft),
        method: 'POST',
      })
      setComplaintItems((items) => [payload.complaint, ...items])
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Complaint could not be submitted')
      return
    }
    setTitle('')
    setComment('')
    setCategory('Workplace')
    triggerToast(
      category === 'System' && (role === 'companySupervisor' || role === 'universitySupervisor')
        ? 'Technical complaint submitted to administrator'
        : role === 'companySupervisor'
          ? 'Complaint submitted to university supervisor'
          : 'Complaint submitted',
    )
  }

  const addComment = async (complaint: ComplaintRecord) => {
    const nextComment = role === 'intern' ? 'Intern added a follow-up comment.' : 'Supervisor added a response comment.'
    try {
      const payload = await apiJson<{ complaint: ComplaintRecord }>(
        `/api/complaints/${encodeURIComponent(complaint.id)}/comments`,
        {
          body: JSON.stringify({ comment: nextComment }),
          method: 'POST',
        },
      )
      setComplaintItems((items) => items.map((item) => (item.id === complaint.id ? payload.complaint : item)))
      triggerToast('Comment added')
      return
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Comment could not be added')
      return
    }
  }

  return (
    <div className="module-stack">
      <div className="module-header">
        <div>
          <span className="eyebrow-text">Complaints, comments, resolution tracking</span>
          <h2>Complaints and comments</h2>
        </div>
        <button className="primary-button" onClick={submitComplaint} type="button">
          <Send size={17} aria-hidden="true" />
          <span>Submit</span>
        </button>
      </div>

      <div className="split-grid">
        <section className="panel">
          <PanelHeader icon={MessageSquare} title="New complaint" />
          <div className="form-stack">
            <label>
              <span>Title</span>
              <input
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter complaint title"
                value={title}
              />
            </label>
            <label>
              <span>Category</span>
              <select
                onChange={(event) => setCategory(event.target.value as ComplaintRecord['category'])}
                value={category}
              >
                <option value="Workplace">Workplace</option>
                <option value="Attendance">Attendance</option>
                <option value="Supervisor feedback">Supervisor feedback</option>
                <option value="System">Technical/System</option>
              </select>
            </label>
            <label>
              <span>Comment</span>
              <textarea
                onChange={(event) => setComment(event.target.value)}
                placeholder="Add details or a supervisor comment"
                rows={5}
                value={comment}
              />
            </label>
            <div className="inline-success compact">
              <Send size={16} aria-hidden="true" />
              <span>Routes to: {complaintAudience}</span>
            </div>
          </div>
        </section>

        <section className="panel">
          <PanelHeader icon={ShieldCheck} title="Complaint access" />
          <div className="access-summary">
            <strong>
              {role === 'admin'
                ? 'All complaints visible'
                : role === 'intern'
                  ? 'Own complaints only'
                  : role === 'companySupervisor'
                    ? 'Company supervisor queue'
                    : 'University supervisor queue'}
            </strong>
            <p>
              {role === 'admin'
                ? 'Administrator receives all technical complaints from work and university supervisors, plus full system visibility.'
                : role === 'intern'
                  ? 'Interns can submit complaints and view comments on their own submissions.'
                  : role === 'companySupervisor'
                    ? 'Work supervisor complaints route to the university supervisor unless marked technical/system.'
                    : 'University supervisors receive work-supervisor complaints and can send technical/system complaints to admin.'}
            </p>
          </div>
        </section>
      </div>

      <DataTable
        columns={['ID', 'Title', 'Submitted by', 'Audience', 'Category', 'Priority', 'Status', 'Latest comment', 'Action']}
        renderRow={(complaint: ComplaintRecord) => (
          <>
            <td>{complaint.id}</td>
            <td>{complaint.title}</td>
            <td>{complaint.submittedBy}</td>
            <td>{complaint.audience}</td>
            <td>{complaint.category}</td>
            <td>
              <StatusPill status={complaint.priority} />
            </td>
            <td>
              <StatusPill status={complaint.status} />
            </td>
            <td>{complaint.latestComment}</td>
            <td>
              <button className="ghost-button" onClick={() => addComment(complaint)} type="button">
                <MessageSquare size={15} aria-hidden="true" />
                <span>Comment</span>
              </button>
            </td>
          </>
        )}
        rows={visibleComplaints}
        title="Complaint queue"
      />
    </div>
  )
}

function DocumentsView({ role, triggerToast }: ViewProps & { role: RoleId }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentItems, setDocumentItems] = useState<DocumentRecord[]>([])
  const canUpload = role === 'admin' || role === 'companySupervisor' || role === 'universitySupervisor'

  useEffect(() => {
    let ignored = false

    const loadDocuments = async () => {
      try {
        const payload = await apiJson<{ documents: DocumentRecord[] }>('/api/documents')
        if (!ignored) {
          setDocumentItems(payload.documents)
        }
      } catch {
        if (!ignored) {
          triggerToast('Local API unavailable; documents will appear after the backend reconnects')
        }
      }
    }

    void loadDocuments()

    return () => {
      ignored = true
    }
  }, [])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null)
  }

  const uploadDocument = async () => {
    if (!selectedFile) {
      triggerToast('Choose a PDF, DOC, or DOCX document first')
      return
    }

    const extension = selectedFile.name.split('.').pop()?.toUpperCase()
    if (!extension || !['PDF', 'DOC', 'DOCX'].includes(extension)) {
      triggerToast('Only PDF, DOC, and DOCX files are allowed')
      return
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      triggerToast('Document must be 5 MB or smaller')
      return
    }

    try {
      const contentBase64 = await readFileAsBase64(selectedFile)
      const payload = await apiJson<{ document: DocumentRecord }>('/api/documents', {
        body: JSON.stringify({
          audience:
            role === 'universitySupervisor' ? 'University supervisors' : role === 'companySupervisor' ? 'Assigned interns' : 'All interns',
          contentBase64,
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          sizeBytes: selectedFile.size,
          title: selectedFile.name.replace(/\.[^.]+$/, ''),
        }),
        method: 'POST',
      })
      setDocumentItems((items) => [payload.document, ...items])
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Document upload failed')
      return
    }
    setSelectedFile(null)
    triggerToast(`${selectedFile.name} published for download`)
  }

  const downloadDocument = async (documentItem: DocumentRecord) => {
    const response = await fetch(`${apiBaseUrl}/api/documents/${encodeURIComponent(documentItem.id)}/download`, {
      headers: {
        ...(readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {}),
      },
    })
    if (!response.ok) {
      triggerToast('Document download failed')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = documentItem.fileName ?? `${documentItem.title.replaceAll(' ', '-')}.${documentItem.fileType.toLowerCase()}`
    link.click()
    URL.revokeObjectURL(url)
    triggerToast(`${documentItem.title} downloaded`)
  }

  return (
    <div className="module-stack">
      <div className="module-header">
        <div>
          <span className="eyebrow-text">Secure uploads and supervisor resources</span>
          <h2>Document center</h2>
        </div>
        {canUpload && (
          <button className="primary-button" onClick={uploadDocument} type="button">
            <UploadCloud size={17} aria-hidden="true" />
            <span>Publish</span>
          </button>
        )}
      </div>

      <div className="split-grid">
        {canUpload && (
          <section className="panel">
            <PanelHeader icon={UploadCloud} title="Supervisor upload" />
            <label className="upload-zone">
              <UploadCloud size={26} aria-hidden="true" />
              <strong>{selectedFile?.name ?? 'Select document'}</strong>
              <span>{selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : 'PDF, DOC, or DOCX up to 5 MB'}</span>
              <input
                accept=".doc,.docx,.pdf,application/msword,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                type="file"
              />
            </label>
          </section>
        )}

        <section className="panel">
          <PanelHeader icon={Download} title="Intern downloads" />
          <div className="document-note">
            <strong>{role === 'intern' ? 'Available supervisor documents' : 'Published documents'}</strong>
            <p>
              {role === 'intern'
                ? 'Download templates, checklists, policies, and supervisor resources shared with interns.'
                : 'Supervisors and administrators can publish documents for intern download.'}
            </p>
          </div>
        </section>
      </div>

      <DataTable
        columns={['Document', 'Uploaded by', 'Audience', 'Type', 'Size', 'Uploaded', 'Downloads', 'Action']}
        emptyMessage="Supervisor uploads will appear here."
        renderRow={(documentItem: DocumentRecord) => (
          <>
            <td>{documentItem.title}</td>
            <td>{documentItem.uploadedBy}</td>
            <td>{documentItem.audience}</td>
            <td>
              <StatusPill status={documentItem.fileType} />
            </td>
            <td>{documentItem.size}</td>
            <td>{documentItem.uploadedAt}</td>
            <td>{documentItem.downloads}</td>
            <td>
              <button className="ghost-button" onClick={() => downloadDocument(documentItem)} type="button">
                <Download size={15} aria-hidden="true" />
                <span>Download</span>
              </button>
            </td>
          </>
        )}
        rows={documentItems}
        title="Shared library"
      />
    </div>
  )
}

function RankingsView({ placements }: { placements: InternRecord[] }) {
  const rankingRows = useMemo<RankingRecord[]>(
    () =>
      [...placements]
        .sort((left, right) => {
          const leftOverall = Math.round((left.attendance + left.performance) / 2)
          const rightOverall = Math.round((right.attendance + right.performance) / 2)

          return rightOverall - leftOverall
        })
        .map((placement, index) => {
          const overall = Math.round((placement.attendance + placement.performance) / 2)

          return {
            attendance: placement.attendance,
            company: placement.company,
            department: placement.department,
            intern: placement.name,
            overall,
            rank: index + 1,
            reportScore: placement.performance,
            taskCompletion: placement.performance,
            trend: placement.status,
          }
        }),
    [placements],
  )
  const topIntern = rankingRows[0]

  return (
    <div className="module-stack">
      <div className="module-header">
        <div>
          <span className="eyebrow-text">Attendance, tasks, reports, motivation</span>
          <h2>Internship ranking</h2>
        </div>
        <StatusPill status="Updated weekly" />
      </div>

      <div className="split-grid">
        <section className="panel ranking-hero">
          <PanelHeader icon={BarChart3} title="Top performer" />
          {topIntern ? (
            <div className="ranking-medal">
              <span>#{topIntern.rank}</span>
              <div>
                <strong>{topIntern.intern}</strong>
                <p>{topIntern.company} - {topIntern.department}</p>
              </div>
              <b>{topIntern.overall}%</b>
            </div>
          ) : (
            <div className="empty-state">
              <strong>No ranked interns yet</strong>
              <p>Approved interns with placements will appear here.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <PanelHeader icon={Sparkles} title="Encouragement target" />
          <div className="target-list">
            <div>
              <span>Move one rank up</span>
              <ProgressBar value={72} />
            </div>
            <div>
              <span>Submit reports before deadline</span>
              <ProgressBar value={86} />
            </div>
            <div>
              <span>Maintain attendance above 95%</span>
              <ProgressBar value={94} />
            </div>
          </div>
        </section>
      </div>

      <DataTable
        columns={['Rank', 'Intern', 'Company', 'Attendance', 'Tasks', 'Reports', 'Overall', 'Trend']}
        emptyMessage="Ranking will appear after interns are assigned to placements."
        renderRow={(ranking: RankingRecord) => (
          <>
            <td>#{ranking.rank}</td>
            <td>{ranking.intern}</td>
            <td>{ranking.company}</td>
            <td>{ranking.attendance}%</td>
            <td>{ranking.taskCompletion}%</td>
            <td>{ranking.reportScore}%</td>
            <td>
              <strong>{ranking.overall}%</strong>
            </td>
            <td>{ranking.trend}</td>
          </>
        )}
        rows={rankingRows}
        title="Cross-company ranking"
      />
    </div>
  )
}

function AccessLevelsView({ role }: { role: RoleId }) {
  const currentLevel = accessLevels.find((item) => item.role === role) ?? accessLevels[0]

  return (
    <div className="module-stack">
      <div className="module-header">
        <div>
          <span className="eyebrow-text">Prioritized levels, dashboards, privileges</span>
          <h2>Access levels</h2>
        </div>
        <StatusPill status={`Level ${currentLevel.level}`} />
      </div>

      <div className="access-level-grid">
        {accessLevels.map((level: AccessLevelRecord) => (
          <article className={level.role === role ? 'access-card active' : 'access-card'} key={level.role}>
            <span>Level {level.level}</span>
            <strong>{level.label}</strong>
            <p>{level.dashboard}</p>
            <small>{level.privilegeSummary}</small>
            <div>
              {level.canAccess.map((item) => (
                <em key={item}>{item}</em>
              ))}
            </div>
          </article>
        ))}
      </div>

      <section className="panel">
        <PanelHeader icon={LockKeyhole} title="Privilege matrix" />
        <div className="permission-grid">
          <strong>Feature</strong>
          <strong>Admin</strong>
          <strong>Intern</strong>
          <strong>Company</strong>
          <strong>University</strong>
          {permissions.map((permission) => (
            <PermissionRow key={permission.feature} permission={permission} />
          ))}
        </div>
      </section>
    </div>
  )
}

function DirectoryView({
  role,
  placements,
  onDeleteIntern,
  onSavePlacement,
  triggerToast,
}: ViewProps & {
  role: RoleId
  placements: InternRecord[]
  onDeleteIntern: (placement: InternRecord) => Promise<void> | void
  onSavePlacement: (placement: InternRecord) => Promise<void> | void
}) {
  const [placementQuery, setPlacementQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('All companies')
  const [geocoding, setGeocoding] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [placementForm, setPlacementForm] = useState<InternRecord>(emptyPlacementForm)
  const activePlacements = placements.filter((placement) => placement.status === 'Active')
  const needsReviewPlacements = placements.filter((placement) => placement.status === 'Needs review')
  const hostingCompanyCount = new Set(
    placements
      .map((placement) => placement.company)
      .filter((company) => company && company !== 'Unassigned company'),
  ).size
  const averageAttendance =
    placements.length > 0
      ? Math.round(placements.reduce((sum, placement) => sum + placement.attendance, 0) / placements.length)
      : 0
  const companyChoices = useMemo(
    () =>
      Array.from(
        new Set([
          'Unassigned company',
          ...placements.map((placement) => placement.company).filter(Boolean),
        ]),
      ),
    [placements],
  )
  const universityChoices = useMemo(
    () => Array.from(new Set(placements.map((placement) => placement.university).filter(Boolean))),
    [placements],
  )
  const filteredPlacements = useMemo(() => {
    const query = placementQuery.trim().toLowerCase()

    return placements.filter((placement) => {
      const matchesQuery =
        !query ||
        [
          placement.name,
          placement.studentNo,
          placement.company,
          placement.supervisor,
          placement.university,
          placement.department,
          formatCoordinates(companySiteForPlacement(placement)),
          companyLocationForPlacement(placement),
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)
      const matchesCompany = companyFilter === 'All companies' || placement.company === companyFilter
      const matchesStatus = statusFilter === 'All statuses' || placement.status === statusFilter

      return matchesQuery && matchesCompany && matchesStatus
    })
  }, [companyFilter, placementQuery, placements, statusFilter])
  const companyDirectory = useMemo(
    () =>
      Array.from(new Set(placements.map((placement) => placement.company).filter(Boolean))).map((companyName) => {
        const companyPlacements = placements.filter((placement) => placement.company === companyName)
        const firstPlacement = companyPlacements[0]
        const site = companySiteForPlacement(firstPlacement)

        return {
          coordinates: formatCoordinates(site),
          interns: companyPlacements.length,
          location: firstPlacement ? companyLocationForPlacement(firstPlacement) : 'Not assigned',
          name: companyName,
          radiusMeters: site?.radiusMeters ?? firstPlacement?.radiusMeters ?? 150,
        }
      }),
    [placements],
  )
  const universityDirectory = useMemo(
    () =>
      Array.from(new Set(placements.map((placement) => placement.university).filter(Boolean))).map((universityName) => {
        const universityPlacements = placements.filter((placement) => placement.university === universityName)

        return {
          name: universityName,
          students: universityPlacements.length,
        }
      }),
    [placements],
  )

  const exportPlacements = () => {
    const rows = filteredPlacements.map((placement) =>
      [
        placement.name,
        placement.studentNo,
        placement.company,
        companyLocationForPlacement(placement),
        placement.supervisor,
        placement.university,
        placement.department,
        formatCoordinates(companySiteForPlacement(placement)),
        companySiteForPlacement(placement)?.radiusMeters ?? placement.radiusMeters ?? 150,
        placement.attendance,
        placement.performance,
        placement.status,
      ]
        .map(csvCell)
        .join(','),
    )
    downloadTextFile(
      'intern-nexus-active-placements.csv',
      [
        'Intern,Student No,Company,Location,Supervisor,University,Department,Coordinates,Radius,Attendance,Performance,Status',
        ...rows,
      ].join('\n'),
      'text/csv',
    )
    triggerToast('Placement list exported')
  }

  const submitPlacement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const placement: InternRecord = {
      ...placementForm,
      attendance: Math.min(100, Math.max(0, Math.round(Number(placementForm.attendance) || 0))),
      company: placementForm.company.trim(),
      companyAddress: placementForm.companyAddress ?? companySiteForName(placementForm.company)?.address ?? null,
      companyLatitude:
        typeof placementForm.companyLatitude === 'number'
          ? placementForm.companyLatitude
          : companySiteForName(placementForm.company)?.latitude ?? null,
      companyLongitude:
        typeof placementForm.companyLongitude === 'number'
          ? placementForm.companyLongitude
          : companySiteForName(placementForm.company)?.longitude ?? null,
      department: placementForm.department.trim() || 'General',
      name: placementForm.name.trim(),
      performance: Math.min(100, Math.max(0, Math.round(Number(placementForm.performance) || 0))),
      radiusMeters: Math.max(1, Math.round(Number(placementForm.radiusMeters) || 150)),
      studentNo: placementForm.studentNo.trim(),
      supervisor: placementForm.supervisor.trim() || 'Awaiting supervisor',
      university: placementForm.university.trim() || 'Not specified',
    }

    if (!placement.name || !placement.studentNo || !placement.company) {
      triggerToast('Add intern name, student number, and company')
      return
    }

    await onSavePlacement(placement)
    setPlacementForm(emptyPlacementForm)
  }

  const updateCompanyField = (companyName: string) => {
    const site = companySiteForName(companyName)
    setPlacementForm((current) => ({
      ...current,
      company: companyName,
      companyAddress: site?.address ?? null,
      companyLatitude: site?.latitude ?? null,
      companyLongitude: site?.longitude ?? null,
      radiusMeters: site?.radiusMeters ?? current.radiusMeters ?? 150,
    }))
  }

  const lookupCompanyCoordinates = async () => {
    if (geocoding) return
    const companyName = placementForm.company.trim()
    if (!companyName || companyName === 'Unassigned company') {
      triggerToast('Enter the company name first')
      return
    }

    const localSite = companySiteForName(companyName)
    if (localSite) {
      setPlacementForm((current) => ({
        ...current,
        companyAddress: localSite.address ?? current.companyAddress,
        companyLatitude: localSite.latitude,
        companyLongitude: localSite.longitude,
        radiusMeters: localSite.radiusMeters,
      }))
      triggerToast(`Coordinates loaded for ${localSite.name}`)
      return
    }

    setGeocoding(true)
    try {
      const params = new URLSearchParams({ query: companyName })
      const address = placementForm.companyAddress?.trim()
      if (address) {
        params.set('address', address)
      }
      const payload = await apiJson<{ result: CompanyGeocodeResult }>(
        `/api/geocode/company?${params.toString()}`,
      )
      setPlacementForm((current) => ({
        ...current,
        companyAddress: payload.result.address,
        companyLatitude: payload.result.latitude,
        companyLongitude: payload.result.longitude,
        radiusMeters: current.radiusMeters ?? payload.result.radiusMeters,
      }))
      triggerToast(`Coordinates found for ${companyName}`)
    } catch {
      triggerToast('Could not find coordinates. Add branch, road, town, or district and try again.')
    } finally {
      setGeocoding(false)
    }
  }

  return (
    <div className="module-stack">
      <div className="module-header">
        <div>
          <span className="eyebrow-text">Companies, universities, supervisors, RBAC</span>
          <h2>Directory and permissions</h2>
        </div>
      </div>

      <div className="placement-summary-grid">
        <article className="mini-card">
          <UsersRound size={20} aria-hidden="true" />
          <span>Total interns placed</span>
          <strong>{placements.length}</strong>
        </article>
        <article className="mini-card">
          <CheckCircle2 size={20} aria-hidden="true" />
          <span>Active placements</span>
          <strong>{activePlacements.length}</strong>
        </article>
        <article className="mini-card">
          <Building2 size={20} aria-hidden="true" />
          <span>Hosting companies</span>
          <strong>{hostingCompanyCount}</strong>
        </article>
        <article className="mini-card">
          <AlertTriangle size={20} aria-hidden="true" />
          <span>Need assignment/review</span>
          <strong>{needsReviewPlacements.length}</strong>
        </article>
        <article className="mini-card">
          <ClipboardCheck size={20} aria-hidden="true" />
          <span>Average attendance</span>
          <strong>{averageAttendance}%</strong>
        </article>
      </div>

      {role === 'admin' && (
        <section className="panel">
          <PanelHeader icon={MapPin} title="Assign or update placement" />
          <form className="form-grid placement-form" onSubmit={submitPlacement}>
            <label>
              <span>Intern name</span>
              <input
                onChange={(event) => setPlacementForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Farhan Segujja"
                value={placementForm.name}
              />
            </label>
            <label>
              <span>Student number</span>
              <input
                onChange={(event) => setPlacementForm((current) => ({ ...current, studentNo: event.target.value }))}
                placeholder="e.g. SD001"
                value={placementForm.studentNo}
              />
            </label>
            <label>
              <span>Company</span>
              <div className="field-with-action">
                <input
                  list="company-suggestions"
                  onChange={(event) => updateCompanyField(event.target.value)}
                  placeholder="Type company name"
                  value={placementForm.company}
                />
                <button className="secondary-button" disabled={geocoding} onClick={lookupCompanyCoordinates} type="button">
                  <MapPin size={15} aria-hidden="true" />
                  <span>{geocoding ? 'Finding...' : 'Find coordinates'}</span>
                </button>
              </div>
              <datalist id="company-suggestions">
                {companyChoices.map((company) => (
                  <option key={company}>{company}</option>
                ))}
              </datalist>
            </label>
            <label>
              <span>Company branch or address</span>
              <input
                onChange={(event) =>
                  setPlacementForm((current) => ({ ...current, companyAddress: event.target.value }))
                }
                placeholder="e.g. Nakawa, Kampala or Plot 12 Jinja Road"
                value={placementForm.companyAddress ?? ''}
              />
            </label>
            <label>
              <span>University</span>
              <input
                list="university-suggestions"
                onChange={(event) => setPlacementForm((current) => ({ ...current, university: event.target.value }))}
                placeholder="Type any university name"
                value={placementForm.university}
              />
              <datalist id="university-suggestions">
                {universityChoices.map((university) => (
                  <option key={university}>{university}</option>
                ))}
              </datalist>
            </label>
            <label>
              <span>Company supervisor</span>
              <input
                onChange={(event) => setPlacementForm((current) => ({ ...current, supervisor: event.target.value }))}
                placeholder="e.g. Supervisor name"
                value={placementForm.supervisor}
              />
            </label>
            <label>
              <span>Department</span>
              <input
                onChange={(event) => setPlacementForm((current) => ({ ...current, department: event.target.value }))}
                placeholder="e.g. Engineering"
                value={placementForm.department}
              />
            </label>
            <label>
              <span>Attendance %</span>
              <input
                max={100}
                min={0}
                onChange={(event) =>
                  setPlacementForm((current) => ({ ...current, attendance: Number(event.target.value) }))
                }
                type="number"
                value={placementForm.attendance}
              />
            </label>
            <label>
              <span>Performance %</span>
              <input
                max={100}
                min={0}
                onChange={(event) =>
                  setPlacementForm((current) => ({ ...current, performance: Number(event.target.value) }))
                }
                type="number"
                value={placementForm.performance}
              />
            </label>
            <label>
              <span>Status</span>
              <select
                onChange={(event) =>
                  setPlacementForm((current) => ({
                    ...current,
                    status: event.target.value as InternRecord['status'],
                  }))
                }
                value={placementForm.status}
              >
                {placementStatusOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Company latitude</span>
              <input
                onChange={(event) =>
                  setPlacementForm((current) => ({
                    ...current,
                    companyLatitude: event.target.value === '' ? null : Number(event.target.value),
                  }))
                }
                placeholder="e.g. 0.347600"
                step="any"
                type="number"
                value={placementForm.companyLatitude ?? ''}
              />
            </label>
            <label>
              <span>Company longitude</span>
              <input
                onChange={(event) =>
                  setPlacementForm((current) => ({
                    ...current,
                    companyLongitude: event.target.value === '' ? null : Number(event.target.value),
                  }))
                }
                placeholder="e.g. 32.582500"
                step="any"
                type="number"
                value={placementForm.companyLongitude ?? ''}
              />
            </label>
            <label>
              <span>Allowed radius meters</span>
              <input
                min={1}
                onChange={(event) =>
                  setPlacementForm((current) => ({ ...current, radiusMeters: Number(event.target.value) }))
                }
                type="number"
                value={placementForm.radiusMeters ?? 150}
              />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit">
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>Save placement</span>
              </button>
              <button className="secondary-button" onClick={() => setPlacementForm(emptyPlacementForm)} type="button">
                Clear
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel table-panel">
        <PanelHeader actionLabel="Export" icon={Building2} onAction={exportPlacements} title="Active placement register" />
        <div className="placement-toolbar">
          <label>
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search placements"
              onChange={(event) => setPlacementQuery(event.target.value)}
              placeholder="Search intern, company, supervisor, university..."
              value={placementQuery}
            />
          </label>
          <select
            aria-label="Filter placements by company"
            onChange={(event) => setCompanyFilter(event.target.value)}
            value={companyFilter}
          >
            <option>All companies</option>
            {companyChoices.map((company) => (
              <option key={company}>{company}</option>
            ))}
          </select>
          <select
            aria-label="Filter placements by status"
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option>All statuses</option>
            {placementStatusOptions.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
        <PlacementTable
          onDelete={role === 'admin' ? onDeleteIntern : undefined}
          onEdit={role === 'admin' ? (placement) => setPlacementForm(placement) : undefined}
          placements={filteredPlacements}
        />
      </section>

      <div className="split-grid">
        <section className="panel">
          <PanelHeader icon={Building2} title="Companies" />
          <div className="directory-list">
            {companyDirectory.length === 0 ? (
              <div className="empty-state">
                <strong>No companies yet</strong>
                <p>Companies will appear after interns are assigned to placements.</p>
              </div>
            ) : (
              companyDirectory.map((company) => (
                <article key={company.name}>
                  <strong>{company.name}</strong>
                  <span>{company.interns} assigned interns</span>
                  <p>{company.location}</p>
                  <p>
                    Site: {company.coordinates} - radius {company.radiusMeters} m
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <PanelHeader icon={GraduationCap} title="Universities" />
          <div className="directory-list">
            {universityDirectory.length === 0 ? (
              <div className="empty-state">
                <strong>No universities yet</strong>
                <p>Universities will appear after interns are assigned to placements.</p>
              </div>
            ) : (
              universityDirectory.map((university) => (
                <article key={university.name}>
                  <strong>{university.name}</strong>
                  <span>{university.students} assigned students</span>
                  <p>Created from saved placement records.</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      {role === 'admin' && (
        <section className="panel">
          <PanelHeader icon={LockKeyhole} title="Role permissions" />
          <div className="permission-grid">
            <strong>Feature</strong>
            <strong>Admin</strong>
            <strong>Intern</strong>
            <strong>Company</strong>
            <strong>University</strong>
            {permissions.map((permission) => (
              <PermissionRow key={permission.feature} permission={permission} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function PlacementTable({
  compact = false,
  onDelete,
  onEdit,
  placements,
}: {
  compact?: boolean
  onDelete?: (placement: InternRecord) => void
  onEdit?: (placement: InternRecord) => void
  placements: InternRecord[]
}) {
  if (placements.length === 0) {
    return (
      <div className="empty-state">
        <strong>No placements found</strong>
        <p>Adjust the filters or add a placement for an approved intern.</p>
      </div>
    )
  }

  const columns = compact
    ? ['Intern', 'Company', 'Location', 'Status']
    : [
        'Intern',
        'Student No',
        'Company',
        'Location',
        'Coordinates',
        'Supervisor',
        'University',
        'Attendance',
        'Performance',
        'Status',
      ]

  return (
    <div className="table-scroll placement-table">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
            {!compact && (onEdit || onDelete) && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {placements.map((placement) => (
            <tr key={placement.studentNo}>
              <td>
                <strong>{placement.name}</strong>
                <small>{placement.department}</small>
              </td>
              {!compact && <td>{placement.studentNo}</td>}
              <td>{placement.company}</td>
              <td>
                {companyLocationForPlacement(placement)}
                {compact && <small>{formatCoordinates(companySiteForPlacement(placement))}</small>}
              </td>
              {!compact && (
                <>
                  <td>
                    {formatCoordinates(companySiteForPlacement(placement))}
                    <small>Radius {companySiteForPlacement(placement)?.radiusMeters ?? placement.radiusMeters ?? 150} m</small>
                  </td>
                  <td>{placement.supervisor}</td>
                  <td>{placement.university}</td>
                  <td>
                    <ProgressBar value={placement.attendance} />
                    <small>{placement.attendance}%</small>
                  </td>
                  <td>
                    <ProgressBar value={placement.performance} />
                    <small>{placement.performance}%</small>
                  </td>
                </>
              )}
              <td>
                <StatusPill status={placement.status} />
              </td>
              {!compact && (onEdit || onDelete) && (
                <td>
                  <div className="table-actions">
                    {onEdit && (
                      <button className="secondary-button table-action" onClick={() => onEdit(placement)} type="button">
                        <Settings size={15} aria-hidden="true" />
                        <span>Edit</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="secondary-button danger-button table-action"
                        onClick={() => onDelete(placement)}
                        type="button"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PermissionRow({
  permission,
}: {
  permission: {
    feature: string
    admin: boolean
    intern: boolean
    companySupervisor: boolean
    universitySupervisor: boolean
  }
}) {
  const cells = [
    permission.admin,
    permission.intern,
    permission.companySupervisor,
    permission.universitySupervisor,
  ]

  return (
    <>
      <span>{permission.feature}</span>
      {cells.map((allowed, index) => (
        <span className={allowed ? 'allowed' : 'blocked'} key={`${permission.feature}-${index}`}>
          {allowed ? 'Yes' : 'No'}
        </span>
      ))}
    </>
  )
}

function SecurityView({
  accountRequests,
  onReviewAccountRequest,
}: {
  accountRequests: AccountRequest[]
  onReviewAccountRequest: (requestId: string, status: Exclude<AccountRequestStatus, 'Pending'>) => void
}) {
  const securityItems = [
    { label: 'JWT access and refresh tokens', icon: KeyRound },
    { label: 'Password hashing and reset flow', icon: LockKeyhole },
    { label: 'CSRF, SQL injection, and XSS controls', icon: ShieldCheck },
    { label: 'Audit logs and activity history', icon: Activity },
    { label: 'Secure uploads with validation', icon: UploadCloud },
    { label: 'Role permission middleware', icon: Settings },
  ]
  const pendingRequestCount = accountRequests.filter((request) => request.status === 'Pending').length
  const [backupStatus, setBackupStatus] = useState('')
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [resetCredential, setResetCredential] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [cleanupPreview, setCleanupPreview] = useState<CleanupPreview | null>(null)
  const [auditLogs, setAuditLogs] = useState<ActivityLog[]>([])

  useEffect(() => {
    let ignored = false
    const loadAuditLogs = async () => {
      try {
        const payload = await apiJson<{ auditLogs: AdminAuditLog[] }>('/api/audit-logs?pageSize=12')
        if (ignored) return
        setAuditLogs(
          payload.auditLogs.map((log) => ({
            action: log.action.replaceAll('.', ' '),
            actor: `${log.actorName} (${log.actorRole})`,
            time: new Date(log.occurredAt).toLocaleString(),
            tone: 'blue',
          })),
        )
      } catch {
        if (!ignored) setAuditLogs([])
      }
    }

    void loadAuditLogs()
    return () => {
      ignored = true
    }
  }, [])

  const downloadBackup = async () => {
    try {
      const backup = await apiJson<{ exportedAt: string; system: string; version: string; data: unknown }>('/api/admin/backup')
      downloadTextFile(
        `intern-nexus-backup-${backup.exportedAt.slice(0, 10)}.json`,
        JSON.stringify(backup, null, 2),
        'application/json',
      )
      setBackupStatus('Backup downloaded successfully.')
    } catch (error) {
      setBackupStatus(error instanceof Error ? error.message : 'Backup failed.')
    }
  }

  const restoreBackup = async () => {
    if (!restoreFile) {
      setBackupStatus('Choose a backup JSON file first.')
      return
    }

    try {
      const backup = JSON.parse(await restoreFile.text())
      const payload = await apiJson<{ counts: Record<string, number>; restoredAt: string }>('/api/admin/restore', {
        body: JSON.stringify({ backup }),
        method: 'POST',
      })
      setBackupStatus(`Backup restored. ${payload.counts.approvedAccounts ?? 0} approved accounts loaded.`)
    } catch (error) {
      setBackupStatus(error instanceof Error ? error.message : 'Restore failed. Check that the file is valid JSON.')
    }
  }

  const resetUserPassword = async () => {
    try {
      const payload = await apiJson<{ temporaryPassword: string | null }>('/api/admin/password-reset', {
        body: JSON.stringify({
          credential: resetCredential.trim(),
          newPassword: resetPassword.trim() || undefined,
        }),
        method: 'POST',
      })
      setTemporaryPassword(payload.temporaryPassword ?? resetPassword.trim())
      setResetPassword('')
      setBackupStatus('Password reset saved.')
    } catch (error) {
      setBackupStatus(error instanceof Error ? error.message : 'Password reset failed.')
    }
  }

  const previewCleanup = async () => {
    try {
      const payload = await apiJson<CleanupPreview>('/api/admin/cleanup-stale')
      setCleanupPreview(payload)
      setBackupStatus(`${payload.candidates.length} cleanup candidates found.`)
    } catch (error) {
      setBackupStatus(error instanceof Error ? error.message : 'Cleanup preview failed.')
    }
  }

  const applyCleanup = async () => {
    const confirmed = window.confirm('Apply stale-data cleanup? Download a backup first if you want a restore point.')
    if (!confirmed) return

    try {
      const payload = await apiJson<{ removed: Record<string, number> }>('/api/admin/cleanup-stale', {
        body: JSON.stringify({ apply: true }),
        method: 'POST',
      })
      setCleanupPreview(null)
      setBackupStatus(`Cleanup applied: ${Object.entries(payload.removed).map(([key, value]) => `${value} ${key}`).join(', ') || 'nothing removed'}.`)
    } catch (error) {
      setBackupStatus(error instanceof Error ? error.message : 'Cleanup failed.')
    }
  }

  return (
    <div className="module-stack">
      <div className="module-header">
        <div>
          <span className="eyebrow-text">Authentication, authorization, auditability</span>
          <h2>Security center</h2>
        </div>
      </div>

      <div className="security-grid">
        {securityItems.map((item) => {
          const Icon = item.icon
          return (
            <article className="security-item" key={item.label}>
              <Icon size={20} aria-hidden="true" />
              <strong>{item.label}</strong>
            </article>
          )
        })}
      </div>

      {backupStatus && (
        <div className="inline-success compact">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>{backupStatus}</span>
        </div>
      )}

      <div className="split-grid">
        <section className="panel">
          <PanelHeader icon={Download} title="Backup and restore" />
          <div className="form-stack">
            <p>Download a local JSON backup before cleanup, restore, or deployment changes.</p>
            <div className="button-row">
              <button className="primary-button" onClick={downloadBackup} type="button">
                <Download size={16} aria-hidden="true" />
                <span>Download backup</span>
              </button>
            </div>
            <label>
              <span>Restore backup JSON</span>
              <input accept="application/json,.json" onChange={(event) => setRestoreFile(event.target.files?.[0] ?? null)} type="file" />
            </label>
            <button className="secondary-button" onClick={restoreBackup} type="button">
              <UploadCloud size={16} aria-hidden="true" />
              <span>Restore backup</span>
            </button>
          </div>
        </section>

        <section className="panel">
          <PanelHeader icon={KeyRound} title="Admin password reset" />
          <div className="form-stack">
            <label>
              <span>User email or assigned ID</span>
              <input
                onChange={(event) => setResetCredential(event.target.value)}
                placeholder="e.g. SD002 or user@email.com"
                value={resetCredential}
              />
            </label>
            <label>
              <span>New password</span>
              <input
                onChange={(event) => setResetPassword(event.target.value)}
                placeholder="Leave blank to generate one"
                type="password"
                value={resetPassword}
              />
            </label>
            <button className="primary-button" onClick={resetUserPassword} type="button">
              <KeyRound size={16} aria-hidden="true" />
              <span>Reset password</span>
            </button>
            {temporaryPassword && (
              <div className="inline-success compact">
                <KeyRound size={16} aria-hidden="true" />
                <span>Temporary password: {temporaryPassword}</span>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="panel">
        <PanelHeader icon={Trash2} title="Stale/test data cleanup" />
        <div className="button-row">
          <button className="secondary-button" onClick={previewCleanup} type="button">
            <Search size={16} aria-hidden="true" />
            <span>Preview cleanup</span>
          </button>
          <button className="secondary-button danger-button" onClick={applyCleanup} type="button">
            <Trash2 size={16} aria-hidden="true" />
            <span>Apply cleanup</span>
          </button>
        </div>
        {cleanupPreview && (
          <div className="account-request-list">
            {cleanupPreview.candidates.length === 0 ? (
              <div className="empty-state">
                <strong>No stale records found</strong>
                <p>The cleanup rules did not find obvious localhost test data.</p>
              </div>
            ) : (
              cleanupPreview.candidates.map((candidate) => (
                <article className="account-request-card" key={`${candidate.collection}-${candidate.itemId}`}>
                  <div className="account-request-main">
                    <div>
                      <strong>{candidate.label}</strong>
                      <span>{candidate.collection}</span>
                    </div>
                    <StatusPill status="Needs review" />
                  </div>
                  <p>{candidate.reason}</p>
                </article>
              ))
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <PanelHeader icon={UserCheck} title={`Account approvals (${pendingRequestCount} pending)`} />
        {accountRequests.length === 0 ? (
          <div className="empty-state">
            <strong>No account requests yet</strong>
            <p>New users who click Create an account will appear here for administrator approval.</p>
          </div>
        ) : (
          <div className="account-request-list">
            {accountRequests.map((request) => {
              const requestRole = roles.find((roleOption) => roleOption.id === request.role)?.label ?? 'User'
              return (
                <article className="account-request-card" key={request.id}>
                  <div className="account-request-main">
                    <div>
                      <strong>{request.name}</strong>
                      <span>{request.email}</span>
                    </div>
                    <StatusPill status={request.status} />
                  </div>
                  <div className="account-request-meta">
                    <span>{requestRole}</span>
                    <span>{request.loginLabel}: {request.loginId}</span>
                    <span>{request.organization}</span>
                    <span>Requested {request.requestedAt}</span>
                  </div>
                  {request.note && <p>{request.note}</p>}
                  {request.status === 'Pending' ? (
                    <div className="button-row">
                      <button
                        className="primary-button"
                        onClick={() => onReviewAccountRequest(request.id, 'Approved')}
                        type="button"
                      >
                        <CheckCircle2 size={16} aria-hidden="true" />
                        <span>Approve</span>
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => onReviewAccountRequest(request.id, 'Rejected')}
                        type="button"
                      >
                        <AlertTriangle size={16} aria-hidden="true" />
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : (
                    <small>Reviewed {request.reviewedAt ?? 'recently'}</small>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <PanelHeader icon={ShieldCheck} title="Audit stream" />
        <ActivityFeed logs={auditLogs} />
      </section>
    </div>
  )
}

function DataTable<T>({
  columns,
  emptyMessage,
  rows,
  renderRow,
  title,
}: {
  columns: string[]
  emptyMessage?: string
  rows: T[]
  renderRow: (row: T) => ReactNode
  title: string
}) {
  return (
    <section className="panel table-panel">
      <PanelHeader icon={FileText} title={title} />
      {rows.length === 0 ? (
        <div className="empty-state">
          <strong>No records yet</strong>
          <p>{emptyMessage ?? 'Records created in the system will appear here.'}</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>{renderRow(row)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function StatusPill({ status }: { status: string }) {
  return <span className={`status-pill tone-${statusTone(status)}`}>{status}</span>
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = clampPercent(value)
  return (
    <div className="progress-track" aria-label={`Progress ${safeValue}%`}>
      <span style={{ width: `${safeValue}%` }} />
    </div>
  )
}

type TrendSeriesKey = 'attendance' | 'reports' | 'tasks' | 'punctuality'

function TrendChart({
  data,
  seriesA,
  seriesB,
  labelA,
  labelB,
  colorA,
  colorB,
}: {
  data: TrendPoint[]
  seriesA: TrendSeriesKey
  seriesB: TrendSeriesKey
  labelA: string
  labelB: string
  colorA: string
  colorB: string
}) {
  const width = 680
  const height = 290
  const padding = 38
  const plotWidth = width - padding * 2
  const plotHeight = height - padding * 2
  const min = 0
  const max = 100
  const safeData = data.length > 0 ? data : [{ attendance: 0, label: 'Now', punctuality: 0, reports: 0, tasks: 0 }]
  const pointX = (index: number) => padding + (safeData.length === 1 ? 0.5 : index / (safeData.length - 1)) * plotWidth
  const pointY = (value: number) => padding + ((max - value) / (max - min)) * plotHeight
  const pathFor = (key: TrendSeriesKey) =>
    safeData
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${pointX(index)} ${pointY(point[key])}`)
      .join(' ')
  const areaPath = `${pathFor(seriesA)} L ${pointX(safeData.length - 1)} ${height - padding} L ${padding} ${
    height - padding
  } Z`

  return (
    <div className="svg-chart">
      <svg aria-label={`${labelA} and ${labelB} trend`} role="img" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`${seriesA}-${seriesB}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={colorA} stopOpacity="0.28" />
            <stop offset="100%" stopColor={colorA} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line className="chart-grid" x1={padding} x2={width - padding} y1={pointY(tick)} y2={pointY(tick)} />
            <text className="chart-label" x={8} y={pointY(tick) + 4}>
              {tick}
            </text>
          </g>
        ))}
        <path d={areaPath} fill={`url(#${seriesA}-${seriesB}-fill)`} />
        <path className="chart-line" d={pathFor(seriesA)} stroke={colorA} />
        <path className="chart-line thin" d={pathFor(seriesB)} stroke={colorB} />
        {safeData.map((point, index) => (
          <g key={point.label}>
            <circle cx={pointX(index)} cy={pointY(point[seriesA])} fill={colorA} r="4" />
            <circle cx={pointX(index)} cy={pointY(point[seriesB])} fill={colorB} r="3" />
            <text className="chart-label" textAnchor="middle" x={pointX(index)} y={height - 8}>
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="chart-legend">
        <span>
          <i style={{ background: colorA }} />
          {labelA}
        </span>
        <span>
          <i style={{ background: colorB }} />
          {labelB}
        </span>
      </div>
    </div>
  )
}

function BarComparisonChart({
  data,
}: {
  data: Array<{ completion: number; department: string; interns: number }>
}) {
  const width = 680
  const height = 290
  const padding = 42
  const max = 110
  const safeData = data.length > 0 ? data : [{ completion: 0, department: 'No data', interns: 0 }]
  const groupWidth = (width - padding * 2) / safeData.length
  const scaleY = (value: number) => (value / max) * (height - padding * 2)

  return (
    <div className="svg-chart">
      <svg aria-label="Department performance chart" role="img" viewBox={`0 0 ${width} ${height}`}>
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = height - padding - scaleY(tick)
          return (
            <g key={tick}>
              <line className="chart-grid" x1={padding} x2={width - padding} y1={y} y2={y} />
              <text className="chart-label" x={8} y={y + 4}>
                {tick}
              </text>
            </g>
          )
        })}
        {safeData.map((item, index) => {
          const x = padding + index * groupWidth + 16
          const internsHeight = scaleY(item.interns)
          const completionHeight = scaleY(item.completion)
          return (
            <g key={item.department}>
              <rect
                fill="#2f6fbb"
                height={internsHeight}
                rx="6"
                width="20"
                x={x}
                y={height - padding - internsHeight}
              />
              <rect
                fill="#2f9e73"
                height={completionHeight}
                rx="6"
                width="20"
                x={x + 26}
                y={height - padding - completionHeight}
              />
              <text className="chart-label" textAnchor="middle" x={x + 24} y={height - 8}>
                {item.department}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="chart-legend">
        <span>
          <i style={{ background: '#2f6fbb' }} />
          Interns
        </span>
        <span>
          <i style={{ background: '#2f9e73' }} />
          Completion
        </span>
      </div>
    </div>
  )
}

function DonutChart({
  completion,
  data,
}: {
  completion: number
  data: Array<{ color: string; name: string; value: number }>
}) {
  const visibleData = data.some((entry) => entry.value > 0)
    ? data
    : [{ color: '#97a3b6', name: 'No tasks', value: 1 }]
  const total = visibleData.reduce((sum, entry) => sum + entry.value, 0)
  let cumulative = 0

  return (
    <svg aria-label="Task completion mix" className="donut-chart" role="img" viewBox="0 0 220 220">
      <circle className="donut-bg" cx="110" cy="110" r="74" />
      {visibleData.map((entry) => {
        const ratio = entry.value / total
        const dashArray = `${ratio * 465} 465`
        const dashOffset = -cumulative * 465
        cumulative += ratio
        return (
          <circle
            className="donut-segment"
            cx="110"
            cy="110"
            key={entry.name}
            r="74"
            stroke={entry.color}
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
          />
        )
      })}
      <text className="donut-number" textAnchor="middle" x="110" y="104">
        {completion}%
      </text>
      <text className="donut-label" textAnchor="middle" x="110" y="128">
        complete
      </text>
    </svg>
  )
}

export default App
