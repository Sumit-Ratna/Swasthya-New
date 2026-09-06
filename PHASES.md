# Development Phases

**Product:** SwasthyaSetu --- AI-Assisted Rural Healthcare Coordination
& Closed-Loop Referral Platform\
**Problem Statement ID:** 26133\
**Roadmap Goal:** Build a credible MVP first, then harden the system for
pilot readiness without over-engineering.

------------------------------------------------------------------------

# 0. Roadmap Philosophy

SwasthyaSetu should be built in dependency order.

The team should **not** attempt to build every feature simultaneously.

The highest-value sequence is:

``` text
Foundation
   ↓
Core Patient + Health Worker Workflow
   ↓
AI Safety + Triage
   ↓
Facility Recommendation
   ↓
Closed-Loop Referral
   ↓
Facility Operations + Doctor Assignment
   ↓
Consultation + Follow-up
   ↓
Offline Hardening + Patient Self-Service
   ↓
Admin + Analytics
   ↓
Security + Testing
   ↓
Deployment + Demo
```

The closed-loop referral remains the central differentiator.

------------------------------------------------------------------------

# Phase 0 --- Product, Workflow & Technical Validation

## Objective

Ensure the team is building the correct system before writing
substantial code.

## Tasks

-   Freeze the core product vision from `PRD.md` and `MVP.md`.
-   Validate the end-to-end referral workflow.
-   Define exact responsibilities of:
    -   Patient
    -   Caregiver relationship
    -   Health Worker
    -   Facility operations
    -   Doctor
    -   Admin
-   Define routine vs urgent referral behavior.
-   Define facility-centric referral semantics.
-   Define internal doctor assignment semantics.
-   Define offline behavior.
-   Define the referral state machine.
-   Identify clinical workflows that require domain validation.
-   Review existing government systems conceptually.
-   Avoid making unsupported claims about ABDM/eSanjeevani.
-   Decide final MVP technology choices.

## Technical decisions to freeze

-   Flutter
-   Spring Boot modular monolith
-   FastAPI AI service
-   PostgreSQL / Supabase PostgreSQL
-   local SQLite-based storage
-   FCM
-   optional Redis
-   optional object storage
-   OSM/OSRM with fallback

## Deliverables

-   Final workflow diagram
-   Role/permission matrix
-   Referral state machine
-   Initial database ERD
-   Architecture decision record
-   Final MVP scope

------------------------------------------------------------------------

# Phase 1 --- Repository & Development Foundation

## Objective

Create a clean, reproducible project foundation.

## Tasks

### Repository

Recommended structure:

``` text
swasthyasetu/
├── apps/
│   ├── mobile/
│   └── admin/
├── services/
│   ├── backend/
│   └── ai/
├── docs/
├── scripts/
└── README.md
```

The exact repository structure may differ, but module boundaries must
remain clear.

### Flutter

-   Initialize Flutter project.
-   Material 3.
-   Routing.
-   Theme.
-   Role-aware navigation.
-   Environment configuration.
-   Basic local persistence abstraction.

### Backend

-   Initialize Java 21 + Spring Boot.
-   Create module packages.
-   Configure validation.
-   Configure persistence.
-   Configure authentication.
-   Configure API error format.
-   Configure database migrations.

### Database

Start with PostgreSQL.

Supabase may be used as the managed PostgreSQL environment, but do not
couple the domain layer unnecessarily to Supabase-specific APIs.

### AI

-   Initialize FastAPI service.
-   `/health`
-   `/triage` contract.
-   Model/rule artifact loading.

### Dev environment

-   `.env.example`
-   local configuration
-   basic Docker Compose if useful
-   GitHub Actions for test/build

## Deliverable

A developer can clone the repository and run:

``` text
Flutter
Backend
AI service
Database
```

with documented setup instructions.

------------------------------------------------------------------------

# Phase 2 --- Authentication, RBAC & Core Data Model

## Objective

Build the security and data foundation before feature logic.

## Tasks

-   Authentication.
-   JWT/session management.
-   User roles.
-   Facility scoping.
-   Patient identity.
-   Patient deduplication.
-   Consent capture.
-   Caregiver authorization relationship.
-   Facility records.
-   Specialty records.
-   Doctor records.
-   Facility capability records.

## Permission tests

Verify that:

-   Health Worker cannot access another facility's patients.
-   Doctor cannot access unrelated facility referrals.
-   Patient cannot access another patient's data.
-   Caregiver sees only explicitly authorized information.
-   Admin sees only permitted jurisdictional information.

## Deliverable

Secure authenticated users can create and retrieve correctly scoped
records.

------------------------------------------------------------------------

# Phase 3 --- Patient + Health Worker Core Workflow

## Objective

Build the most important frontline workflow before adding sophisticated
AI.

## Tasks

### Health Worker

-   Home dashboard.
-   Patient registration.
-   Duplicate warning.
-   Patient search.
-   Assessment form.
-   Vitals.
-   Symptoms.
-   Patient history.
-   Referral preparation.

### Patient

Implement only the patient self-service functionality that is already
included in the updated MVP.

Possible initial capabilities:

-   basic account/profile,
-   own referral/appointment status,
-   basic next-action information.

Do not turn this phase into a separate consumer health application.

### Caregiver

-   Patient-authorized relationship.
-   Scoped access.
-   Revoke access.

## Deliverable

A Health Worker can:

``` text
Login
→ Register/find patient
→ Record assessment
→ View patient history
```

------------------------------------------------------------------------

# Phase 4 --- AI-Assisted Risk Triage

## Objective

Implement safe decision support.

## Tasks

### Safety layer first

Implement deterministic rules for:

-   invalid vitals,
-   defined danger signs,
-   incomplete data,
-   high-risk escalation conditions.

### AI layer

-   Feature preparation.
-   Baseline model if justified.
-   Risk classification.
-   Flagged factors.
-   Confidence where meaningful.
-   Conservative fallback.

### API

``` text
POST /api/triage
```

### Human override

-   Health Worker/authorized user can override where allowed.
-   Mandatory reason.
-   Audit event.

## Testing

Test:

-   normal input,
-   incomplete input,
-   dangerous input,
-   invalid vitals,
-   AI unavailable,
-   low-confidence model output.

## Deliverable

Assessment → safe risk stratification works without diagnosis output.

------------------------------------------------------------------------

# Phase 5 --- Facility Recommendation Engine

## Objective

Build the routing differentiator.

## Tasks

Implement:

-   facility capability matching,
-   specialty matching,
-   diagnostic availability,
-   facility operational status,
-   distance calculation,
-   appointment/availability,
-   load,
-   freshness of availability data.

### Ranking

Implement configuration-driven weights.

### Hard filters

Exclude clearly unsuitable facilities before scoring.

### Explanation

Every recommendation must provide understandable reasons.

Example:

``` text
Recommended because:
✓ Required specialty available
✓ Required diagnostics available
✓ Suitable for urgency
✓ 18 km away
```

## External service fallback

If OSRM is unavailable:

``` text
OSRM → Haversine
```

## Deliverable

Health Worker can see 1--3 appropriate facilities with reasons.

------------------------------------------------------------------------

# Phase 6 --- Referral State Machine & Closed Loop Foundation

## Objective

Implement the project's single canonical referral state machine as a
real, enforced state machine. This is the only referral state-machine
definition in the roadmap; no other phase may introduce a competing or
overlapping set of referral states.

## Canonical states

`TRIAGED` is the entry point of the referral lifecycle. There is no
separate `CREATED` referral state — if patient/encounter records are
created earlier (Phase 2/3), that is record creation, not a referral
status, and it must not be modeled as a referral state.

Implement the full canonical state machine:

-   `TRIAGED` (entry state --- assessment complete, AI/rule risk output
    produced),
-   `FACILITY_RECOMMENDED` (routine path),
-   `FACILITY_SELECTED`,
-   `FACILITY_CONFIRMATION_PENDING`,
-   `ACCEPTED`,
-   `APPOINTMENT_BOOKED`,
-   `PATIENT_IN_TRANSIT`,
-   `PATIENT_REACHED`,
-   `DOCTOR_ASSIGNED`,
-   `CONSULTATION_COMPLETED`,
-   `DIAGNOSTICS_PENDING` → `DIAGNOSTICS_COMPLETED` (optional branch),
-   `TREATMENT_COMPLETED`,
-   `FOLLOW_UP_PENDING` → `FOLLOW_UP_COMPLETED`,
-   `CANCELLED`, `MISSED_APPOINTMENT`, `FAILED_REFERRAL` (terminal/failure
    states).

`CANCELLED` is reachable both before facility selection and after
(`FACILITY_SELECTED → CANCELLED`), e.g. if the patient no longer needs
care.

Also implement, as part of this same state machine (not a separate one):

-   `URGENT_ESCALATION` and `FACILITY_ALERTED` for the emergency branch
    (`TRIAGED → URGENT_ESCALATION → FACILITY_ALERTED → PATIENT_IN_TRANSIT`),
-   `REROUTING_REQUIRED` as the single operational-failure state used for
    facility decline/unavailability/no-eligible-doctor, independent of
    urgency — both routine and urgent referrals reroute back into
    `FACILITY_RECOMMENDED` for re-scoring; if no suitable facility can be
    found, the referral moves to `FAILED_REFERRAL`.

Emergency and rerouting are exercised end-to-end in Phase 10; this phase
must lay down the states and transition rules so Phase 10 has no gaps to
patch by inventing new states.

### Critical rule

Do not allow arbitrary status edits.

All transitions must:

-   be valid (only the transitions defined above are permitted),
-   be authorized,
-   create an event,
-   record actor/time/reason.

### Referral destination

The referral points to a facility (`FACILITY_SELECTED` /
`FACILITY_ALERTED`).

Do not make an individual doctor the primary destination or a routing
key at this stage --- doctor assignment happens later, inside Phase 7,
strictly after `PATIENT_REACHED`.

## Deliverable

A referral can move through the full valid lifecycle above (routine and
urgent branches) and its complete history can be inspected. No other
part of PHASES.md defines a conflicting referral state name or sequence.

------------------------------------------------------------------------

# Phase 7 --- Facility Operations & Doctor Assignment

## Objective

Make the receiving facility operationally realistic.

## Tasks

### Facility

Implement:

-   operational status,
-   service capability,
-   diagnostic availability,
-   freshness timestamps,
-   basic capacity/load.

### Doctor

Implement:

-   profile,
-   specialty,
-   facility association,
-   availability,
-   leave/unavailable state,
-   appointment capacity.

### Assignment

Implement:

``` text
Facility receives referral
→ Required specialty identified
→ Eligible doctors filtered
→ Availability checked
→ Doctor assigned
```

### Important behavior

If the originally suitable doctor becomes unavailable:

``` text
Do not reject the entire referral automatically.
→ Find another eligible doctor.
```

If none exists:

``` text
Show next available option
OR
Trigger rerouting/escalation according to urgency.
```

## Deliverable

Health Workers think in terms of facility capability; the facility
handles doctor assignment internally.

------------------------------------------------------------------------

# Phase 8 --- Appointment Management

## Objective

Make routine referral scheduling reliable.

## Tasks

-   Appointment slots.
-   Slot locking/atomic booking.
-   Booking confirmation (`ACCEPTED` → `APPOINTMENT_BOOKED`).
-   Transition to `PATIENT_IN_TRANSIT` once the patient sets out.
-   Rescheduling.
-   Cancellation (`CANCELLED`).
-   Missed appointment detection (`APPOINTMENT_BOOKED` →
    `MISSED_APPOINTMENT`) with rebooking back into `APPOINTMENT_BOOKED`.
-   Conflict prevention.

## Edge cases

Test:

-   slot disappears before confirmation,
-   simultaneous booking,
-   doctor becomes unavailable,
-   facility closes,
-   patient cancels,
-   patient misses appointment.

## Deliverable

Routine referrals can obtain and maintain a valid appointment without
double booking, using the canonical `APPOINTMENT_BOOKED` /
`MISSED_APPOINTMENT` states from Phase 6.

------------------------------------------------------------------------

# Phase 9 --- Doctor Consultation & Care Closure

## Objective

Complete the clinical side of the referral.

## Tasks

### Doctor dashboard

-   incoming referrals,
-   urgency sorting,
-   patient summary,
-   referral history.

### Consultation

-   consultation notes,
-   outcome,
-   transition to `CONSULTATION_COMPLETED`.

### Prescription

-   medication records,
-   prescription generation,
-   secure retrieval,
-   transition to `TREATMENT_COMPLETED`.

### Diagnostics (optional branch)

-   order (`CONSULTATION_COMPLETED` → `DIAGNOSTICS_PENDING`),
-   result (`DIAGNOSTICS_PENDING` → `DIAGNOSTICS_COMPLETED` →
    `TREATMENT_COMPLETED`),
-   "not required" path (`CONSULTATION_COMPLETED` →
    `TREATMENT_COMPLETED` directly).

Diagnostics must never be forced on a patient who does not need them;
both branches are first-class, not one a fallback of the other.

### Follow-up

-   schedule date (`TREATMENT_COMPLETED` → `FOLLOW_UP_PENDING`),
-   reminder generation,
-   follow-up completion (`FOLLOW_UP_PENDING` → `FOLLOW_UP_COMPLETED`),
-   expired/unresolved follow-up window → `FAILED_REFERRAL`.

## Deliverable

The complete routine flow works, using the canonical states end to end:

``` text
TRIAGED
→ FACILITY_RECOMMENDED → FACILITY_SELECTED
→ FACILITY_CONFIRMATION_PENDING → ACCEPTED
→ APPOINTMENT_BOOKED → PATIENT_IN_TRANSIT → PATIENT_REACHED
→ DOCTOR_ASSIGNED
→ CONSULTATION_COMPLETED
→ (DIAGNOSTICS_PENDING → DIAGNOSTICS_COMPLETED, optional)
→ TREATMENT_COMPLETED
→ FOLLOW_UP_PENDING → FOLLOW_UP_COMPLETED
```

------------------------------------------------------------------------

# Phase 10 --- Emergency & Rerouting Hardening

## Objective

Ensure the system does not trap urgent cases inside a routine
appointment workflow.

## Tasks

Implement, using the states already defined in Phase 6:

-   `TRIAGED → URGENT_ESCALATION` for high-risk cases,
-   `URGENT_ESCALATION → FACILITY_ALERTED` (nearest capable facility
    identified; user proceeds without waiting for confirmation),
-   `FACILITY_ALERTED → PATIENT_IN_TRANSIT` when the facility can handle
    the case,
-   `FACILITY_ALERTED → REROUTING_REQUIRED` when it cannot,
-   Clinical deterioration discovered after `ACCEPTED` is **not** modeled
    as an `ACCEPTED → URGENT_ESCALATION` transition — it is logged as a
    `REFERRAL_EVENTS` entry (e.g. `CLINICAL_DETERIORATION_FLAGGED`) that
    triggers human/facility action,
-   `REROUTING_REQUIRED → FACILITY_RECOMMENDED` (applies to both routine
    and urgent reroutes) and `REROUTING_REQUIRED → FAILED_REFERRAL` (when
    no suitable facility can be found).

### Rerouting is not automatically urgent

`REROUTING_REQUIRED` is an operational-failure state covering: facility
unavailable, facility rejects the referral, facility lacks required
capability, doctor unavailable, or no suitable doctor/service. It is
independent of urgency. A routine referral that fails to find a facility
does **not** become `URGENT_ESCALATION` --- it re-enters
`FACILITY_RECOMMENDED`. Only genuine clinical high-risk triggers
`URGENT_ESCALATION`.

### Emergency rule

Do not require routine appointment acceptance
(`FACILITY_CONFIRMATION_PENDING → ACCEPTED → APPOINTMENT_BOOKED`) before
urgent escalation. The urgent branch bypasses routine facility
recommendation/selection/confirmation entirely so care is never delayed.

### No live availability

If connectivity/live data is unavailable:

-   show last known information,
-   show freshness,
-   warn user,
-   allow human decision,
-   synchronize later.

## Deliverable

The system has a demonstrable urgent pathway that does not depend on
waiting indefinitely for a routine appointment.

------------------------------------------------------------------------

# Phase 11 --- Offline-First Health Worker Mode

## Objective

Turn offline support into a real product capability rather than a future
concept.

## Tasks

### Local database

Persist:

-   patient data required for current workflow,
-   assessments,
-   referral drafts,
-   referral events,
-   essential facility data.

### Outbox

Implement:

-   local event ID,
-   device ID,
-   idempotency key,
-   retry state.

### Sync

Implement:

``` text
Offline write
→ Queue
→ Connectivity restored
→ Server validation
→ Transaction
→ Server response
→ Local reconciliation
```

### Conflict handling

Do not use last-write-wins for:

-   referral state,
-   appointments,
-   doctor assignment,
-   emergency escalation.

### UI

Display:

-   Offline
-   Saved locally
-   Sync pending
-   Synced
-   Conflict/action required

## Deliverable

A Health Worker can complete the core capture workflow with no internet
and safely synchronize later.

------------------------------------------------------------------------

# Phase 12 --- Offline Emergency Mode

## Objective

Handle the hardest connectivity scenario.

## Test scenario

``` text
No internet
→ High-risk patient
→ Assessment saved
→ Temporary referral ID
→ Last-known facility capability
→ Emergency guidance
→ Patient care not blocked by app
→ Internet restored
→ Referral synchronized
→ Facility notified
→ Conflict reconciled
```

## Explicit limitation

The application must never claim live facility acceptance while
completely offline.

## Deliverable

A judge can intentionally disable connectivity and observe a safe
degradation path.

------------------------------------------------------------------------

# Phase 13 --- Notifications & Follow-up Reliability

## Objective

Ensure referral continuity does not depend on users constantly checking
the application.

## Tasks

Implement:

-   in-app notifications,
-   FCM push,
-   optional SMS adapter,
-   referral updates,
-   appointment reminders,
-   missed appointment alerts,
-   follow-up reminders,
-   rerouting alerts.

## Failure handling

If push fails:

``` text
In-app notification remains available.
```

Notifications are not the source of truth.

## Deliverable

Critical events are visible even when an external notification provider
fails.

------------------------------------------------------------------------

# Phase 14 --- Patient Self-Service & Caregiver Experience

## Objective

Strengthen accessibility without replacing the Health Worker model.

## Patient capabilities

Where enabled:

-   registration/login,
-   basic profile,
-   referral status,
-   facility information,
-   appointment status,
-   next action,
-   follow-up reminders.

## Caregiver

-   request/receive authorization,
-   scoped view,
-   revoke access.

## Safety

Do not expose:

-   raw AI model internals,
-   unsupported diagnosis,
-   treatment recommendations generated by AI.

## Deliverable

A capable patient can independently understand and follow their care
journey, while patients needing assistance can continue using the Health
Worker route.

------------------------------------------------------------------------

# Phase 15 --- Multilingual & Voice Support

## Objective

Reduce language and literacy barriers.

## Tasks

-   English.
-   Hindi.
-   Marathi.
-   Language switching.
-   Voice input for symptoms.
-   Speech-to-text integration.

## Important

Voice is an input method, not a diagnostic engine.

The same AI safety boundaries apply to transcribed text.

## Deliverable

A Health Worker can capture symptoms using supported languages/voice
input.

------------------------------------------------------------------------

# Phase 16 --- Admin Dashboard & Operational Analytics

## Objective

Make the closed-loop impact visible.

## Dashboard metrics

-   referral completion rate,
-   average referral processing time,
-   appointment delay,
-   missed appointments,
-   failed referrals,
-   rerouting frequency,
-   follow-up completion,
-   facility bottlenecks,
-   high-risk follow-up visibility,
-   stale facility data,
-   AI override rate,
-   AI fallback frequency.

## Privacy

Prefer aggregated views.

Patient-identifiable data should be exposed only when necessary.

## Deliverable

Admin can identify where referrals are getting stuck.

------------------------------------------------------------------------

# Phase 17 --- Security, Privacy & Audit Hardening

## Objective

Move from "works" to "responsible prototype."

## Tasks

-   RBAC penetration checks.
-   Facility-scope testing.
-   Consent enforcement.
-   Caregiver authorization checks.
-   Audit log verification.
-   Local storage protection.
-   Input validation.
-   Rate limiting where justified.
-   Secure secrets management.
-   Token expiry.
-   Sensitive logging review.

## Deliverable

Security controls are demonstrably enforced rather than merely
documented.

------------------------------------------------------------------------

# Phase 18 --- Interoperability Readiness

## Objective

Prepare for future integration without pretending it already exists.

## Tasks

Map internal entities conceptually to:

-   Patient,
-   Observation,
-   Encounter,
-   ServiceRequest,
-   DiagnosticReport,
-   MedicationRequest.

Document:

-   what a future ABDM integration would require,
-   what is not implemented,
-   what external authorization would be required.

## Deliverable

A clear interoperability roadmap with no false integration claims.

------------------------------------------------------------------------

# Phase 19 --- Testing & Reliability

Testing should begin during implementation, but this phase consolidates
the full test suite.

## Unit testing

Test:

-   referral state machine,
-   facility scoring,
-   availability filtering,
-   doctor assignment,
-   triage rules,
-   sync logic,
-   conflict rules.

## Integration testing

Test:

-   Flutter → backend,
-   backend → database,
-   backend → AI,
-   notification adapter,
-   sync API.

## API security testing

Test:

-   invalid token,
-   expired token,
-   role bypass,
-   facility bypass,
-   unauthorized patient access,
-   caregiver scope violation.

## End-to-end referral scenarios

Explicitly test the full canonical-state journeys:

-   **Routine:** `TRIAGED → FACILITY_RECOMMENDED → FACILITY_SELECTED →
    ACCEPTED → APPOINTMENT_BOOKED → PATIENT_IN_TRANSIT →
    PATIENT_REACHED → DOCTOR_ASSIGNED → CONSULTATION_COMPLETED →
    TREATMENT_COMPLETED`.
-   **Emergency:** `TRIAGED → URGENT_ESCALATION → FACILITY_ALERTED →
    PATIENT_IN_TRANSIT → PATIENT_REACHED → DOCTOR_ASSIGNED →
    CONSULTATION_COMPLETED`, including emergency failure scenarios
    (alerted facility cannot handle the case).
-   **Rerouting:** facility unavailable/declines/lacks capability →
    `REROUTING_REQUIRED` → re-enters `FACILITY_RECOMMENDED` for
    re-scoring (applies to both routine and urgent referrals). Also test
    the failure path: `REROUTING_REQUIRED` with no suitable facility
    found → `FAILED_REFERRAL`.
-   **Cancellation:** test both `TRIAGED → CANCELLED` (withdrawn before
    facility selection) and `FACILITY_SELECTED → CANCELLED` (withdrawn
    after a facility was already selected, e.g. patient improved).
-   **Doctor failure:** `PATIENT_REACHED` with no eligible doctor
    available → alternative doctor found and `DOCTOR_ASSIGNED`, or (if
    none exists) `REROUTING_REQUIRED`.
-   **Diagnostics required:** `CONSULTATION_COMPLETED →
    DIAGNOSTICS_PENDING → DIAGNOSTICS_COMPLETED → TREATMENT_COMPLETED`.
-   **Diagnostics not required:** `CONSULTATION_COMPLETED →
    TREATMENT_COMPLETED` directly.

## Offline testing

Explicitly test:

1.  offline registration,
2.  offline assessment,
3.  offline referral,
4.  reconnect → server confirmation (local save is never treated as
    server confirmation),
5.  duplicate retry,
6.  conflicting referral state,
7.  stale facility data,
8.  emergency offline flow: offline → local emergency record → last-known
    facility information → stale availability indication → delayed
    synchronization → no false acceptance confirmation → sync.

## Failure injection

Simulate:

-   AI unavailable,
-   database temporary failure,
-   maps unavailable,
-   notification unavailable,
-   facility unavailable,
-   doctor unavailable.

## AI evaluation

Report actual results.

Never fabricate:

-   accuracy,
-   sensitivity,
-   specificity,
-   clinical validation.

## Deliverable

A test report covering functionality, security, offline behavior and AI
limitations.

------------------------------------------------------------------------

# Phase 20 --- Local Demo Stabilization

## Objective

Make the entire MVP run reliably on the team's MacBook before cloud
deployment.

## Tasks

-   One-command or clearly documented startup.
-   Seed demo facilities.
-   Seed demo doctors.
-   Seed availability.
-   Seed safe demo patient data.
-   Verify role accounts.
-   Verify complete referral journey.
-   Verify offline mode.
-   Verify emergency scenario.

## Demo data

Use fictional/synthetic patient information.

Never use real patient information for a hackathon demo unless
appropriately authorized and protected.

## Deliverable

A clean local demonstration environment.

------------------------------------------------------------------------

# Phase 21 --- Deployment & CI/CD

## Objective

Create a reproducible demo/pilot environment.

## Tasks

-   Build backend.
-   Build AI service.
-   Configure database.
-   Configure object storage if needed.
-   Configure notifications.
-   Configure HTTPS.
-   Configure secrets.
-   Configure backups.
-   Configure health checks.
-   Configure GitHub Actions.

Docker can be used for deployment reproducibility.

Kubernetes is not required.

## Deliverable

A live deployment with reproducible builds.

------------------------------------------------------------------------

# Phase 22 --- SIH Demo Preparation

## Objective

Turn the product into a compelling, technically defensible
demonstration.

## Primary demo

Use the updated **Meena's Journey**.

Recommended story:

``` text
Patient arrives
↓
Health Worker records assessment
↓
AI-assisted risk triage
↓
Facility recommendation
↓
Facility-centric referral
↓
Doctor assignment inside facility
↓
Consultation
↓
Diagnostics / prescription
↓
Follow-up
↓
Referral closed
↓
Admin sees completed journey
```

## Secondary demo

Demonstrate:

``` text
No internet
↓
Health Worker continues
↓
Emergency/high-risk case
↓
Cached facility information
↓
Urgent escalation
↓
Temporary local referral
↓
Connectivity restored
↓
Safe synchronization
```

## Judge questions to prepare

-   Why is this different from eSanjeevani?
-   Why facility-centric instead of doctor-centric?
-   What happens if a doctor is unavailable?
-   What happens if the facility rejects/cannot handle the case?
-   How does the system work offline?
-   How does it prevent duplicate records?
-   What happens when offline data conflicts with server data?
-   Why use PostgreSQL/Supabase?
-   Why separate the AI service?
-   How does AI avoid becoming a diagnosis system?
-   What happens if AI fails?
-   How would ABDM integration happen?
-   What happens if facility availability data is stale?
-   What happens in an emergency?

## Deliverable

A rehearsed demo and Q&A script.

------------------------------------------------------------------------

# Phase 23 --- Pilot Readiness

This is post-MVP/hackathon hardening.

## Tasks

-   Real-world workflow validation with authorized stakeholders.
-   Usability testing with representative health workers.
-   Connectivity testing in realistic environments.
-   Clinical/domain review of triage rules.
-   Facility data governance.
-   Availability update process.
-   Privacy/legal review.
-   Backup and disaster recovery.
-   Monitoring improvements.
-   Formal interoperability planning.

## Deliverable

Pilot-readiness report.

------------------------------------------------------------------------

# Phase 24 --- Future Scale

Explicitly future/post-hackathon.

Potential work:

-   district deployment,
-   Maharashtra-wide deployment,
-   formal ABDM integration,
-   eSanjeevani interoperability,
-   expanded languages,
-   advanced voice interfaces,
-   predictive medicine demand,
-   aggregated outbreak signals,
-   larger analytics platform,
-   selective service extraction,
-   stronger infrastructure automation.

Nothing in this phase should be presented as already implemented.

------------------------------------------------------------------------

# Dependency Map

``` mermaid
flowchart TD
    P0[Phase 0<br/>Validation] --> P1[Phase 1<br/>Foundation]
    P1 --> P2[Phase 2<br/>Auth + Data]
    P2 --> P3[Phase 3<br/>Patient + HW]
    P3 --> P4[Phase 4<br/>AI Triage]
    P4 --> P5[Phase 5<br/>Facility Recommendation]
    P5 --> P6[Phase 6<br/>Referral State Machine]
    P6 --> P7[Phase 7<br/>Facility + Doctor Assignment]
    P7 --> P8[Phase 8<br/>Appointments]
    P8 --> P9[Phase 9<br/>Doctor + Closure]
    P9 --> P10[Phase 10<br/>Emergency + Rerouting]
    P10 --> P11[Phase 11<br/>Offline]
    P11 --> P12[Phase 12<br/>Offline Emergency]
    P9 --> P13[Phase 13<br/>Notifications]
    P3 --> P14[Phase 14<br/>Patient + Caregiver]
    P3 --> P15[Phase 15<br/>Language + Voice]
    P9 --> P16[Phase 16<br/>Admin]
    P16 --> P17[Phase 17<br/>Security]
    P17 --> P18[Phase 18<br/>FHIR Readiness]
    P10 --> P19[Phase 19<br/>Testing]
    P19 --> P20[Phase 20<br/>Local Demo]
    P20 --> P21[Phase 21<br/>Deployment]
    P21 --> P22[Phase 22<br/>SIH Demo]
    P22 --> P23[Phase 23<br/>Pilot]
    P23 --> P24[Phase 24<br/>Future Scale]
```

------------------------------------------------------------------------

# MVP Cut Line

If development time becomes limited, use this strict priority.

## P0 --- Must work

1.  Authentication + RBAC
2.  Patient registration + deduplication
3.  Health Worker assessment
4.  AI/rule-based triage
5.  Facility recommendation
6.  Facility-centric referral
7.  Referral state machine
8.  Appointment booking
9.  Facility/doctor availability basics
10. Doctor assignment
11. Doctor consultation
12. Prescription
13. Diagnostics
14. Follow-up
15. Referral closure
16. Basic admin dashboard

## P1 --- Strongly preferred / pilot-readiness

1.  Offline-first Health Worker mode
2.  Offline emergency mode
3.  Rerouting
4.  Facility freshness/availability
5.  Notifications
6.  Hindi/Marathi
7.  Voice input
8.  Patient self-service
9.  Caregiver relationship
10. Enhanced facility operational controls

## P2 --- Future / stretch

1.  Live ABDM integration
2.  eSanjeevani interoperability
3.  Advanced predictive analytics
4.  Expanded multilingual voice
5.  Large-scale infrastructure
6.  Advanced operational optimization

------------------------------------------------------------------------

# Parallel Development Strategy

The phases are ordered by dependency, but some work can happen in
parallel after the relevant contracts are frozen.

``` text
Backend team:
Auth → Data → Referral → Facility → Doctor → Admin

AI team:
Rule safety → Triage API → Evaluation

Flutter team:
Role shell → HW workflow → Doctor workflow → Patient workflow → Offline

Infrastructure:
DB → CI → Environments → Deployment

Testing:
Begin with every completed module
```

Do not wait until the end to test.

------------------------------------------------------------------------

# Definition of Done

A phase is not complete merely because the code compiles.

A phase is complete when:

-   functionality works,
-   API authorization is tested,
-   failure behavior is defined,
-   relevant audit events exist,
-   UI handles errors,
-   data is persisted correctly,
-   documentation matches implementation,
-   tests exist for critical logic.

------------------------------------------------------------------------

# Final Build Order

For actual implementation, the team should follow:

``` text
1. Repository + environment
2. Database + migrations
3. Auth + RBAC
4. Patient
5. Health Worker
6. Assessment
7. Rule-based triage
8. AI service
9. Facility data
10. Facility recommendation
11. Referral state machine
12. Appointment
13. Facility availability
14. Doctor availability
15. Doctor assignment
16. Doctor dashboard
17. Consultation
18. Diagnostics
19. Prescription
20. Follow-up
21. Emergency/rerouting
22. Offline sync
23. Offline emergency
24. Notifications
25. Patient self-service
26. Caregiver access
27. Multilingual/voice
28. Admin dashboard
29. Security hardening
30. Testing
31. Local demo
32. Deployment
33. SIH demo
```

------------------------------------------------------------------------

# Final Roadmap Principle

The project should never become "feature-complete but unreliable."

The priority is:

> **A smaller system that reliably closes a referral loop is more
> valuable than a huge system that only creates referrals.**

The core proof remains:

``` text
Need identified
→ Risk assessed safely
→ Right facility selected
→ Facility can actually handle the case
→ Doctor/service assigned
→ Patient reaches care
→ Consultation/treatment recorded
→ Follow-up tracked
→ Outcome visible
```

That is the system the architecture and development roadmap are designed
to build.
