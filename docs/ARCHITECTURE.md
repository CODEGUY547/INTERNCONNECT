# InternConnect Architecture

InternConnect is structured as a modular SaaS application with a React client, a Node API boundary, and a normalized PostgreSQL data model.

## Layers

- Client: React + TypeScript workspace with role-aware modules for administrators, interns, company supervisors, and university supervisors.
- API: Node HTTP service in `server/index.mjs`. In local development it persists workflow data to `server/data-store.json`; for production it should be extended with middleware, JWT verification, validation, and Socket.IO.
- Database: PostgreSQL schema in `database/schema.sql` covering users, roles, attendance, tasks, reports, logbooks, messages, notifications, evaluations, visits, files, leave requests, sessions, reset tokens, and audit logs.
- Realtime: UI is designed around live status and notification flows. Production implementation should emit attendance, message, task, report, and announcement events over Socket.IO.
- Storage: File metadata is normalized in `files`; production storage can target Cloudinary, Supabase Storage, S3, or local disk behind signed URLs.
- GPS attendance: the client uses the browser Geolocation API for live coordinates and maps them with OpenStreetMap by default. Check-in sends the intern student number to the API, which resolves the assigned placement and compares live GPS against that company's configured latitude, longitude, and radius. Successful check-in and check-out actions create attendance events that appear in the university supervisor notification center. Google Maps can be opened from the captured coordinates or integrated with an API key later.
- Active placements: administrators can view, filter, export, and update the intern-company-supervisor placement register from the directory module.
- Complaints and comments: interns submit complaints, supervisors respond with comments, and administrators can view or escalate all complaint records.
- Documents: supervisors and administrators publish DOCX/PDF/XLSX resources through shared document records; interns download documents based on audience rules.
- Ranking: weekly ranking snapshots compare attendance, task completion, report quality, and overall score across internship placements.

## Role Boundaries

- Administrator: global user management, placement management, analytics, report exports, announcements, password resets, and audit review.
- Intern: check-in/out, GPS/QR attendance, logbook entries, weekly reports, task progress, messages, leave requests, and evaluation viewing.
- Company supervisor: assigned intern tracking, attendance approval, task management, report review, logbook approval, announcements, and evaluations.
- University supervisor: student monitoring, visit scheduling, report approval, evaluation reporting, logbook downloads, analytics, and cross-supervisor communication.

## Access Priority

- Level 1 Administrator: can access every dashboard and system module.
- Level 2 Company Supervisor: can access company supervision workflows and assigned intern records.
- Level 3 University Supervisor: can access academic supervision workflows and assigned student records.
- Level 4 Intern: can access only personal internship workflows, downloads, complaints, and ranking views.

The client starts at a login screen and persists a session in browser storage for the selected account level. Login now validates through `/api/auth/login` when the local API is available, while keeping demo fallback data for local resilience. In production, passwords should be hashed, JWT access/refresh tokens should be enforced, and server-side permission checks should protect every endpoint.

## Local Persistence

During localhost development, these workflows are connected to the Node API and saved in `server/data-store.json`:

- Account requests, admin approval/rejection, and approved login accounts.
- Active intern placements, including free-entry company and university names, geocoded company coordinates, supervisor, status, attendance, and performance.
- Attendance check-in/check-out events for university supervisor notifications.
- Announcements posted from the Announce composer.
- Complaints, comments, and notification-center resolution.
- Task creation from the task board.
- Chat messages from the message composer.
- Shared document metadata from supervisor/admin uploads.

This local JSON store is useful for testing interactions before deployment. It is not a replacement for the normalized PostgreSQL schema in `database/schema.sql`.

## Production Next Steps

- Add JWT access and refresh token middleware.
- Add password hashing with bcrypt or Argon2.
- Add Zod validation for every request body.
- Add Socket.IO channels scoped by role, company, university, and conversation.
- Add Prisma or Drizzle migrations from the SQL model.
- Add PDF and Excel export services.
- Add secure upload scanning and file size/type policies.
- Enforce server-side GPS geofencing against company coordinates before accepting attendance.
