export type RoleId =
  | 'admin'
  | 'intern'
  | 'companySupervisor'
  | 'universitySupervisor'

export type StatusTone =
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'violet'
  | 'slate'

export interface RoleProfile {
  id: RoleId
  label: string
  shortLabel: string
  profileName: string
  organization: string
  summary: string
}

export interface Metric {
  label: string
  value: string
  delta: string
  tone: StatusTone
}

export interface TrendPoint {
  label: string
  attendance: number
  reports: number
  tasks: number
  punctuality: number
}

export interface InternRecord {
  name: string
  studentNo: string
  company: string
  companyAddress?: string | null
  companyLatitude?: number | null
  companyLongitude?: number | null
  university: string
  supervisor: string
  attendance: number
  performance: number
  radiusMeters?: number | null
  status: 'Active' | 'Late' | 'Needs review' | 'On leave'
  department: string
}

export interface AttendanceRecord {
  name: string
  studentNo?: string
  checkIn: string
  checkOut: string
  status: 'Present' | 'Late' | 'Working' | 'Absent' | 'Checked out'
  location: string
  distance: string
  hours: string
}

export interface TaskRecord {
  company?: string
  id?: string
  title: string
  intern: string
  priority: 'High' | 'Medium' | 'Low'
  deadline: string
  status: 'Pending' | 'In Progress' | 'Submitted' | 'Needs correction' | 'Completed' | 'Overdue' | 'Rejected'
  progress: number
  attachments: number
  reviewedAt?: string
  reviewedBy?: string
  reviewComment?: string
  submittedAt?: string
  submissionNote?: string
  studentNo?: string
  university?: string
}

export interface ReportRecord {
  company?: string
  companyApprovedAt?: string
  companyApprovedBy?: string
  content?: string
  department?: string
  hoursWorked?: string
  id?: string
  title: string
  owner: string
  periodEnd?: string
  periodStart?: string
  submitted: string
  status: 'Pending company approval' | 'Pending university approval' | 'Approved' | 'Corrections requested' | 'Rejected'
  studentNo?: string
  reviewer: string
  type: 'Daily report' | 'Weekly report' | 'Evaluation' | 'Attendance'
  university?: string
  universityApprovedAt?: string
  universityApprovedBy?: string
}

export interface ChatMessage {
  author: string
  role: string
  time: string
  text: string
  unread?: boolean
}

export interface CalendarEvent {
  date: string
  title: string
  meta: string
  tone: StatusTone
}

export interface EvaluationCriterion {
  label: string
  score: number
  weight: number
}

export interface ActivityLog {
  actor: string
  action: string
  time: string
  tone: StatusTone
}

export interface CompanyRecord {
  name: string
  industry: string
  capacity: number
  interns: number
  latitude: number
  supervisors: number
  longitude: number
  location: string
  radiusMeters: number
}

export interface UniversityRecord {
  name: string
  faculty: string
  department: string
  coordinator: string
  students: number
}

export interface ComplaintRecord {
  id: string
  title: string
  submittedBy: string
  audience: 'Administrator' | 'Company Supervisor' | 'University Supervisor'
  category: 'Workplace' | 'Attendance' | 'Supervisor feedback' | 'System'
  status: 'Open' | 'In review' | 'Resolved' | 'Escalated'
  priority: 'High' | 'Medium' | 'Low'
  submittedAt: string
  latestComment: string
}

export interface DocumentRecord {
  id: string
  title: string
  uploadedBy: string
  audience: 'All interns' | 'Assigned interns' | 'Supervisors' | 'University supervisors'
  fileName?: string
  fileType: 'DOCX' | 'DOC' | 'PDF'
  mimeType?: string
  scanStatus?: string
  size: string
  uploadedAt: string
  downloads: number
}

export interface RankingRecord {
  rank: number
  intern: string
  company: string
  department: string
  attendance: number
  taskCompletion: number
  reportScore: number
  overall: number
  trend: string
}

export interface AccessLevelRecord {
  role: RoleId
  level: number
  label: string
  dashboard: string
  privilegeSummary: string
  canAccess: string[]
}
