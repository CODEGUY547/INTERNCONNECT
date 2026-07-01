# InternConnect

InternConnect is a real-time internship management and supervision platform for interns, company supervisors, university supervisors, and administrators.

## What Is Included

- React + TypeScript dashboard with role switching.
- Admin, intern, company supervisor, and university supervisor workspaces.
- Attendance with real browser GPS capture, live tracking, geofence radius checks, map preview, QR attendance UI, device/IP snapshot, and attendance table.
- Task board with priorities, deadlines, statuses, attachments, and progress.
- Digital logbook, weekly reports, messaging, notifications, calendar, analytics, evaluations, directory, RBAC, and security center.
- Complaints and comments module for intern submissions, supervisor responses, escalation, and resolution tracking.
- Document center where supervisors/admins can select DOCX files for publishing and interns can download shared resources.
- Access level dashboard showing administrator, supervisor, university supervisor, and intern privilege boundaries.
- Internship ranking dashboard comparing interns across companies to encourage stronger performance.
- Custom SVG dashboards for attendance, punctuality, task completion, reports, and department performance.
- Local Node API in `server/index.mjs` with JSON-backed persistence for account approvals, announcements, complaints, tasks, messages, and documents.
- Normalized PostgreSQL schema in `database/schema.sql`.
- Architecture notes in `docs/ARCHITECTURE.md`.

## Run The App

On Windows PowerShell, use `npm.cmd` if script execution blocks `npm`.

```bash
npm.cmd run dev
```

The frontend runs on `http://127.0.0.1:5173`.

## Login And Account Access

Users log in with their approved email address or assigned ID. New users create an account request first, and an administrator must approve the request before the account can access the system.

For local development, the API includes a bootstrap administrator account so the first admin can sign in before any approved accounts exist:

- Administrator ID: `ADM-001`
- Administrator email: `admin@internconnect.local`

Set `BOOTSTRAP_ADMIN_PASSWORD` in your local environment before running the API. Do not use the localhost bootstrap password in production.

Each approved account opens its own dashboard and only shows the modules allowed for that access level. The administrator account can access every module.

## Run The Local API

```bash
npm.cmd run api
```

The API runs on `http://127.0.0.1:4500`. Local data is saved in `server/data-store.json`, so account approvals, placements, announcements, tasks, messages, complaints, and document metadata can survive page refreshes and API restarts during local testing.

Available endpoints:

- `GET /api/health`
- `GET /api/dashboard?role=admin`
- `POST /api/auth/login`
- `GET /api/accounts/approved`
- `GET /api/account-requests`
- `POST /api/account-requests`
- `PATCH /api/account-requests/:id/review`
- `GET /api/placements`
- `POST /api/placements`
- `DELETE /api/interns/:studentNo`
- `GET /api/geocode/company?query=Company%20Name`
- `GET /api/announcements`
- `POST /api/announcements`
- `GET /api/attendance-events`
- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/messages`
- `POST /api/messages`
- `POST /api/attendance/check-in`
- `POST /api/attendance/check-out`
- `GET /api/reports/export?format=pdf`
- `GET /api/complaints`
- `POST /api/complaints`
- `PATCH /api/complaints/:id/resolve`
- `POST /api/complaints/:id/comments`
- `GET /api/documents`
- `POST /api/documents`

## Live GPS Attendance

Open the Attendance module and click `Live GPS` or `Check in`. The browser will ask for location permission. If permission is granted, InternConnect reads the device location, shows it on the map, calculates distance from the registered company coordinates, and blocks check-in when the intern is outside the allowed radius.

The check-in API now resolves the logged-in intern by student number, loads that intern's active placement, and compares live GPS against the latitude, longitude, and radius stored for the assigned company. Administrators can type any company name in `Directory` -> `Assign or update placement`, add a branch/town/address hint when needed, then use `Find coordinates` to fill the company latitude and longitude through the local backend geocoder.

For localhost testing, the API runs in local demo mode unless `STRICT_GEOFENCE=true` is set. Demo mode still captures GPS and reports whether the user is outside the radius, but accepts the check-in so the workflow can be tested away from the company site. Set `STRICT_GEOFENCE=true` before real deployment so outside-radius check-ins are rejected by the backend.

The embedded map uses OpenStreetMap without an API key. The `Google Maps` button opens the captured coordinates in Google Maps. A full embedded Google Maps SDK integration can be added later by setting up a Google Maps API key.

## Build

```bash
npm.cmd run build
```
