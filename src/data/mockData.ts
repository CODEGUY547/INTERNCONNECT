import type {
  AccessLevelRecord,
  ActivityLog,
  AttendanceRecord,
  CompanyRecord,
  ComplaintRecord,
  DocumentRecord,
  EvaluationCriterion,
  InternRecord,
  Metric,
  RankingRecord,
  ReportRecord,
  RoleId,
  RoleProfile,
  TaskRecord,
  TrendPoint,
  UniversityRecord,
} from '../types'

export const roles: RoleProfile[] = [
  {
    id: 'admin',
    label: 'Administrator',
    shortLabel: 'Admin',
    profileName: 'System Administrator',
    organization: 'Intern Nexus HQ',
    summary: 'System-wide control center for users, placements, reports, exports, and audit visibility.',
  },
  {
    id: 'intern',
    label: 'Intern',
    shortLabel: 'Intern',
    profileName: 'Intern User',
    organization: 'Assigned organization',
    summary: 'Daily workspace for attendance, weekly reports, tasks, complaints, documents, and evaluations.',
  },
  {
    id: 'companySupervisor',
    label: 'Company Supervisor',
    shortLabel: 'Company',
    profileName: 'Company Supervisor',
    organization: 'Assigned company',
    summary: 'Operational dashboard for attendance approvals, task supervision, reports, and performance reviews.',
  },
  {
    id: 'universitySupervisor',
    label: 'University Supervisor',
    shortLabel: 'University',
    profileName: 'University Supervisor',
    organization: 'Assigned university',
    summary: 'Academic supervision view for student progress, company coordination, visits, reports, and evaluations.',
  },
]

export const roleMetrics: Record<RoleId, Metric[]> = {
  admin: [
    { label: 'Total interns', value: '0', delta: '0 active now', tone: 'blue' },
    { label: 'Active placements', value: '0', delta: '0% running', tone: 'green' },
    { label: 'Attendance today', value: '0', delta: '0 late arrivals', tone: 'amber' },
    { label: 'Pending reports', value: '0', delta: 'No reports submitted yet', tone: 'violet' },
  ],
  intern: [
    { label: 'Attendance rate', value: '0%', delta: 'Based on saved placement', tone: 'green' },
    { label: 'Hours logged', value: '0', delta: 'Awaiting timesheet records', tone: 'blue' },
    { label: 'Open tasks', value: '0', delta: '0 completed', tone: 'amber' },
    { label: 'Evaluation score', value: '0%', delta: 'Based on saved placement', tone: 'violet' },
  ],
  companySupervisor: [
    { label: 'Assigned interns', value: '0', delta: 'No organization', tone: 'blue' },
    { label: 'Attendance events', value: '0', delta: 'Check-ins/out saved', tone: 'amber' },
    { label: 'Complaints queue', value: '0', delta: 'Unresolved items', tone: 'violet' },
    { label: 'Tasks completed', value: '0%', delta: '0/0 tasks', tone: 'green' },
  ],
  universitySupervisor: [
    { label: 'Assigned students', value: '0', delta: 'No organization', tone: 'blue' },
    { label: 'Reports approved', value: '0', delta: 'No reports submitted yet', tone: 'green' },
    { label: 'Attendance events', value: '0', delta: 'Student check-ins/out', tone: 'amber' },
    { label: 'At-risk students', value: '0', delta: 'Need review placements', tone: 'red' },
  ],
}

export const attendanceTrend: TrendPoint[] = [
  { label: 'Jan', attendance: 60, reports: 60, tasks: 60, punctuality: 60 },
  { label: 'Feb', attendance: 60, reports: 60, tasks: 60, punctuality: 60 },
  { label: 'Mar', attendance: 60, reports: 60, tasks: 60, punctuality: 60 },
  { label: 'Apr', attendance: 60, reports: 60, tasks: 60, punctuality: 60 },
  { label: 'May', attendance: 60, reports: 60, tasks: 60, punctuality: 60 },
  { label: 'Jun', attendance: 60, reports: 60, tasks: 60, punctuality: 60 },
]

export const taskMix = [
  { name: 'Completed', value: 1, color: '#2f9e73' },
  { name: 'In progress', value: 1, color: '#2f6fbb' },
  { name: 'Pending', value: 1, color: '#d89a25' },
  { name: 'Overdue', value: 1, color: '#d9534f' },
]

export const departmentStats = [
  { department: 'General', interns: 0, completion: 0 },
  { department: 'Operations', interns: 0, completion: 0 },
  { department: 'Technical', interns: 0, completion: 0 },
  { department: 'Academic', interns: 0, completion: 0 },
]

export const interns: InternRecord[] = []
export const attendanceRecords: AttendanceRecord[] = []
export const tasks: TaskRecord[] = []
export const reports: ReportRecord[] = []
export const activityLogs: ActivityLog[] = []
export const complaints: ComplaintRecord[] = []
export const sharedDocuments: DocumentRecord[] = []
export const internRankings: RankingRecord[] = []
export const universities: UniversityRecord[] = []
export const aiInsights: string[] = []

export const evaluationCriteria: EvaluationCriterion[] = [
  { label: 'Technical skill', score: 0, weight: 30 },
  { label: 'Communication', score: 0, weight: 20 },
  { label: 'Attendance', score: 0, weight: 20 },
  { label: 'Supervisor feedback', score: 0, weight: 30 },
]

export const companies: CompanyRecord[] = [
  {
    name: 'NITA Uganda',
    industry: 'Government technology',
    capacity: 0,
    interns: 0,
    latitude: 0.3332214,
    supervisors: 0,
    longitude: 32.6016537,
    location: 'National Information Technology Authority, Lugogo By-Pass - Rotary Avenue, Nakawa, Kampala, Uganda',
    radiusMeters: 300,
  },
]

export const permissions = [
  { feature: 'Manage users', admin: true, intern: false, companySupervisor: false, universitySupervisor: false },
  { feature: 'Approve attendance', admin: true, intern: false, companySupervisor: true, universitySupervisor: false },
  { feature: 'Assign tasks', admin: true, intern: false, companySupervisor: true, universitySupervisor: false },
  { feature: 'Submit reports', admin: true, intern: true, companySupervisor: false, universitySupervisor: false },
  { feature: 'Review reports', admin: true, intern: false, companySupervisor: true, universitySupervisor: true },
  { feature: 'Resolve complaints', admin: true, intern: false, companySupervisor: true, universitySupervisor: true },
  { feature: 'Upload shared documents', admin: true, intern: false, companySupervisor: true, universitySupervisor: true },
  { feature: 'Download supervisor documents', admin: true, intern: true, companySupervisor: true, universitySupervisor: true },
  { feature: 'View ranking', admin: true, intern: true, companySupervisor: false, universitySupervisor: true },
]

export const accessLevels: AccessLevelRecord[] = [
  {
    role: 'admin',
    level: 1,
    label: 'Administrator',
    dashboard: 'Full system dashboard',
    privilegeSummary: 'Can access every dashboard, account request, placement, complaint, document, and export.',
    canAccess: ['All dashboards', 'User approvals', 'Placement register', 'Complaints', 'Documents', 'Exports'],
  },
  {
    role: 'companySupervisor',
    level: 2,
    label: 'Company Supervisor',
    dashboard: 'Company supervision dashboard',
    privilegeSummary: 'Can manage assigned interns, tasks, attendance approvals, comments, and shared documents.',
    canAccess: ['Assigned interns', 'Attendance approvals', 'Tasks', 'Reports', 'Complaints', 'Documents'],
  },
  {
    role: 'universitySupervisor',
    level: 3,
    label: 'University Supervisor',
    dashboard: 'Academic supervision dashboard',
    privilegeSummary: 'Can monitor assigned students, visits, reports, evaluations, comments, and shared documents.',
    canAccess: ['Assigned students', 'Reports', 'Evaluations', 'Visits', 'Complaints', 'Documents'],
  },
  {
    role: 'intern',
    level: 4,
    label: 'Intern',
    dashboard: 'Personal internship dashboard',
    privilegeSummary: 'Can access personal attendance, tasks, reports, documents, complaints, and ranking.',
    canAccess: ['Own dashboard', 'Own attendance', 'Own reports', 'Download documents', 'Submit complaints', 'Ranking'],
  },
]
