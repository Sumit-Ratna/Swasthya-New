# System Architecture

**Product:** SwasthyaSetu --- AI-Assisted Rural Healthcare Coordination
& Closed-Loop Referral Platform\
**Problem Statement ID:** 26133\
**Architecture Status:** MVP / Hackathon Build Specification\
**Primary Design Goal:** A buildable, secure, offline-capable modular
platform that closes the healthcare referral loop without turning AI
into an autonomous clinical decision-maker.

------------------------------------------------------------------------

## 1. Architecture Overview

SwasthyaSetu uses a **modular monolith backend + separated AI service +
role-specific Flutter experiences**.

The architecture deliberately avoids a full microservices mesh. The MVP
needs strong module boundaries, but it should remain simple enough for a
student team to build and run locally. The backend therefore remains one
deployable application, while the AI component is separated because it
uses a Python/ML runtime and has a different release lifecycle.

The platform supports multiple user journeys over the same backend:

-   **Patient:** optional self-service entry/status journey where
    supported.
-   **Caregiver:** patient-authorized assistance, preferably modeled as
    a relationship rather than a large independent subsystem.
-   **Health Worker:** offline-first, fast, low-data workflow.
-   **Facility operations:** facility capability, availability,
    appointment and internal doctor assignment.
-   **Doctor:** richer online workflow for referral review,
    consultation, diagnostics, prescriptions and follow-up.
-   **Admin:** web-based oversight and aggregated analytics.

The important architectural distinction is:

> **A referral is made to a facility. The facility is responsible for
> assigning an appropriate doctor internally.**

The platform therefore separates:

1.  **Clinical/routing decision:** Which facility can appropriately
    handle the patient?
2.  **Operational assignment:** Which eligible doctor/service inside
    that facility should handle the case?

This prevents health workers from having to manually select individual
doctors while still allowing the facility to manage doctor schedules and
availability.

### High-level architecture

``` mermaid
graph TD
    P[Patient / Caregiver] -->|HTTPS| API[Spring Boot Modular Monolith]
    HW[Health Worker Flutter App] -->|HTTPS / Sync| API
    D[Doctor Flutter/Web Experience] -->|HTTPS| API
    FS[Facility Operations] -->|HTTPS| API
    AD[Admin Web Dashboard] -->|HTTPS| API

    API --> DB[(PostgreSQL / Supabase PostgreSQL)]
    API --> AI[FastAPI AI Service]
    API --> N[Notification Adapter]
    API --> MAP[Facility / Maps Adapter]
    API --> OBJ[Object Storage]
    API --> AUD[Audit/Event Store]

    AI --> MODEL[(Model / Rule Artifacts)]
    N --> PUSH[FCM / Optional SMS]
    MAP --> OSM[OpenStreetMap / OSRM]
```

------------------------------------------------------------------------

# 2. Architecture Principles

## 2.1 Modular monolith first

The MVP backend is one deployable application with strong internal
modules.

Modules are separated by responsibility and should communicate through
service interfaces rather than directly reaching into each other's
repositories.

This gives the team:

-   simpler local development,
-   fewer deployment failures,
-   easier debugging,
-   one primary transactional database,
-   simpler authentication,
-   a clear migration path if individual components later need
    extraction.

Do not introduce Kubernetes, Kafka, service meshes or unnecessary
distributed infrastructure for the MVP.

## 2.2 AI service separation

The AI service remains a small Python/FastAPI service.

Reasons:

-   Python has the strongest ML/NLP ecosystem.
-   ML dependencies remain isolated from the core backend.
-   Models can be replaced without restructuring the entire backend.
-   AI failures can be handled gracefully by the backend.

The AI service never directly communicates with the Flutter clients.

## 2.3 API-first

All clients communicate through backend APIs.

Clients must never access PostgreSQL/Supabase tables directly.

The backend is responsible for:

-   authentication,
-   authorization,
-   facility scoping,
-   consent enforcement,
-   validation,
-   state transitions,
-   audit logging,
-   business rules.

## 2.4 Offline-first for Health Workers

The Health Worker workflow is designed around intermittent connectivity.

The mobile application maintains a protected local store and an outbox
queue.

Offline data must be clearly labeled as:

-   locally stored,
-   pending synchronization,
-   synchronized,
-   or based on stale cached information.

The application must never imply that an offline user has live knowledge
of facility availability.

## 2.5 Safety before convenience

For healthcare-critical operations:

-   no autonomous diagnosis,
-   no autonomous prescribing,
-   no silent state changes,
-   no silent conflict overwrites,
-   no guarantee of emergency treatment,
-   no blocking emergency escalation merely because appointment
    confirmation is unavailable.

## 2.6 Facility-centric referral

The referral entity points to a **facility**, not a doctor.

Doctor assignment is an operational step performed by the receiving
facility.

## 2.7 Server-authoritative critical state

The server is authoritative for synchronized referral state, appointment
allocation and other shared operational data.

The client can create local pending events, but it cannot permanently
declare a server-side referral state while disconnected.

## 2.8 Auditability

Clinically or operationally significant actions produce immutable
audit/event records.

A current status is useful for fast queries, but the event history is
the source for understanding how that status was reached.

------------------------------------------------------------------------

# 3. Role-Specific Application Architecture

The system is one platform, but each role gets a different experience.

## 3.1 Health Worker experience

Priority:

1.  speed,
2.  offline operation,
3.  low data usage,
4.  minimal typing,
5.  clear next action.

Typical flow:

`Login → Patient → Assessment → Triage → Facility Recommendation → Referral → Tracking`

The app should cache:

-   assigned facilities,
-   facility capability metadata,
-   recent patient records allowed by policy,
-   referral summaries,
-   essential configuration.

It should not cache unnecessary sensitive data.

## 3.2 Doctor experience

Priority:

1.  clinical context,
2.  referral queue,
3.  patient longitudinal summary,
4.  consultation documentation,
5.  diagnostics,
6.  prescription,
7.  follow-up.

The doctor experience can assume better connectivity than the Health
Worker workflow, while still handling temporary network failure
gracefully.

## 3.3 Facility operations experience

Facility operations manages:

-   facility operational status,
-   service capability,
-   diagnostic availability,
-   doctor schedules,
-   doctor availability,
-   appointment slots,
-   referral intake,
-   internal doctor assignment.

For the MVP, this capability may be implemented through authorized
facility staff or appropriately scoped doctor/admin functions if a
separate Facility Staff account would add unnecessary complexity.

The architecture must still represent these concepts independently.

## 3.4 Patient experience

Patient self-service is lightweight.

Patients can:

-   register/login where enabled,
-   provide basic information,
-   request/seek care,
-   view recommendations/status,
-   view appointments,
-   view follow-up reminders,
-   understand what action is expected.

Patient self-service must not expose internal clinical reasoning or
become an autonomous diagnosis interface.

## 3.5 Caregiver relationship

A caregiver should preferably be represented as:

`Patient ↔ Authorized Caregiver`

rather than creating a large independent clinical workflow.

Access is:

-   explicit,
-   scoped,
-   revocable,
-   logged.

------------------------------------------------------------------------

# 4. Backend Module Architecture

  -----------------------------------------------------------------------
  Module                              Responsibility
  ----------------------------------- -----------------------------------
  Auth                                Authentication, token lifecycle,
                                      account security

  User                                Role and account management

  Patient                             Patient identity, demographics,
                                      consent, deduplication

  Caregiver                           Patient-authorized caregiver
                                      relationships and access scope

  Health Worker                       Worker profile and
                                      facility/catchment scope

  Facility                            Facility metadata, capability,
                                      operational status

  Doctor                              Doctor profile, specialty, facility
                                      association

  Availability                        Doctor/service/facility
                                      availability and freshness

  Appointment                         Slot management, booking,
                                      cancellation, conflict prevention

  Referral                            Closed-loop referral state machine
                                      and routing

  Assignment                          Internal facility-to-doctor/service
                                      assignment

  Consultation                        Consultation notes and outcome

  Diagnostic                          Diagnostic orders/results

  Prescription                        Prescription records and documents

  Follow-up                           Follow-up scheduling and reminders

  Notification                        Push/SMS/in-app notification
                                      abstraction

  AI                                  Adapter to FastAPI AI service

  Recommendation                      Facility ranking and explanation

  Sync                                Idempotency, offline events,
                                      reconciliation

  Audit                               Immutable audit/event records

  Admin                               Aggregation, reporting and
                                      operational oversight

  Interoperability                    FHIR-shaped mapping for future ABDM
                                      readiness
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 5. Logical Data Architecture

The database remains relational because SwasthyaSetu contains many
relationships that require integrity:

-   patients ↔ assessments,
-   referrals ↔ facilities,
-   referrals ↔ appointments,
-   referrals ↔ doctor assignments,
-   consultations ↔ prescriptions,
-   consultations ↔ diagnostics,
-   referrals ↔ follow-ups.

PostgreSQL is therefore still the underlying database.

If Supabase is used, it is treated as a **managed PostgreSQL platform**,
not as a different database engine.

------------------------------------------------------------------------

## 5.1 Entity Relationship Diagram

``` mermaid
erDiagram
    USERS ||--o{ HEALTH_WORKERS : has
    USERS ||--o{ DOCTORS : has
    USERS ||--o{ ADMINS : has
    USERS ||--o{ CAREGIVER_RELATIONSHIPS : participates

    FACILITIES ||--o{ HEALTH_WORKERS : hosts
    FACILITIES ||--o{ DOCTORS : employs
    FACILITIES ||--o{ FACILITY_SERVICES : offers

    DOCTORS ||--o{ DOCTOR_SPECIALTIES : has
    SPECIALTIES ||--o{ DOCTOR_SPECIALTIES : maps

    PATIENTS ||--o{ ASSESSMENTS : receives
    PATIENTS ||--o{ VITALS : has
    PATIENTS ||--o{ REFERRALS : subject
    PATIENTS ||--o{ CAREGIVER_RELATIONSHIPS : has

    FACILITIES ||--o{ REFERRALS : receives
    REFERRALS ||--o{ REFERRAL_EVENTS : contains
    REFERRALS ||--o{ APPOINTMENTS : has
    REFERRALS ||--o{ DOCTOR_ASSIGNMENTS : receives
    REFERRALS ||--o{ CONSULTATIONS : results_in
    REFERRALS ||--o{ FOLLOWUPS : requires

    DOCTORS ||--o{ DOCTOR_ASSIGNMENTS : assigned
    DOCTORS ||--o{ CONSULTATIONS : performs

    CONSULTATIONS ||--o{ PRESCRIPTIONS : produces
    CONSULTATIONS ||--o{ DIAGNOSTIC_ORDERS : creates
    DIAGNOSTIC_ORDERS ||--o{ DIAGNOSTIC_RESULTS : produces

    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ AUDIT_LOGS : generates
    USERS ||--o{ SYNC_EVENTS : creates
```

------------------------------------------------------------------------

# 6. Core Data Entities

## 6.1 USERS

``` text
id
full_name
phone
email_optional
password_hash
role
status
created_at
updated_at
last_login_at
```

Roles should be represented by controlled values/relationships rather
than arbitrary client-provided strings.

------------------------------------------------------------------------

## 6.2 PATIENTS

``` text
id
full_name
date_of_birth_or_age
gender
phone_optional
address
abha_id_optional
consent_status
created_at
updated_at
```

Do not use phone number as the sole identity key.

------------------------------------------------------------------------

## 6.3 CAREGIVER_RELATIONSHIPS

``` text
id
patient_id
caregiver_user_id
relationship_type
permission_scope
consent_granted_at
revoked_at
status
created_at
```

------------------------------------------------------------------------

## 6.4 FACILITIES

``` text
id
name
tier
latitude
longitude
address
operational_status
last_verified_at
capacity_per_day
current_load
created_at
updated_at
```

`operational_status` may include:

-   OPEN
-   LIMITED
-   CLOSED
-   EMERGENCY_ONLY
-   UNKNOWN

------------------------------------------------------------------------

## 6.5 FACILITY_SERVICES

``` text
id
facility_id
specialty_id
service_status
diagnostic_capabilities
medicine_availability_optional
last_verified_at
```

This allows facility capability to change independently from the
facility itself.

------------------------------------------------------------------------

## 6.6 DOCTORS

``` text
id
user_id
facility_id
professional_identifier_optional
status
created_at
updated_at
```

Specialty should be represented through a mapping table where multiple
specialties are possible.

------------------------------------------------------------------------

## 6.7 DOCTOR_AVAILABILITY

``` text
id
doctor_id
status
start_time
end_time
availability_source
last_verified_at
```

Possible status:

-   AVAILABLE
-   LIMITED
-   AWAY
-   ON_LEAVE
-   UNAVAILABLE
-   EMERGENCY_ONLY

The UI can translate these into simple human-readable labels.

------------------------------------------------------------------------

## 6.8 REFERRALS

``` text
id
patient_id
created_by_health_worker_id
receiving_facility_id
risk_level
urgency
reason
required_specialty
required_tests
status
created_at
updated_at
server_version
```

Important:

There is **no primary doctor_id on the referral as the destination**.

A doctor assignment is represented separately.

------------------------------------------------------------------------

## 6.9 DOCTOR_ASSIGNMENTS

``` text
id
referral_id
facility_id
doctor_id
assignment_status
assigned_at
assigned_by
reason
```

This preserves the distinction between:

`Referral Destination = Facility`

and

`Care Assignment = Doctor`.

------------------------------------------------------------------------

## 6.10 APPOINTMENTS

``` text
id
referral_id
facility_id
doctor_id_optional
scheduled_start
scheduled_end
status
created_at
updated_at
```

Doctor assignment may happen before or after appointment creation
depending on facility workflow.

------------------------------------------------------------------------

## 6.11 REFERRAL_EVENTS

``` text
id
referral_id
event_type
from_status
to_status
actor_user_id_optional
event_time
reason
metadata
idempotency_key_optional
```

This is the historical record for the referral state machine.

------------------------------------------------------------------------

## 6.12 SYNC_EVENTS

``` text
id
client_id
device_id
local_event_id
entity_type
entity_id
operation
payload_hash
sync_status
created_at
synced_at
conflict_type_optional
```

Sensitive payloads should not be unnecessarily duplicated in logs.

------------------------------------------------------------------------

# 7. Referral State Machine

The referral state machine is the core consistency mechanism.

``` mermaid
stateDiagram-v2
    [*] --> TRIAGED

    TRIAGED --> FACILITY_RECOMMENDED
    FACILITY_RECOMMENDED --> FACILITY_SELECTED

    FACILITY_SELECTED --> FACILITY_CONFIRMATION_PENDING
    FACILITY_CONFIRMATION_PENDING --> ACCEPTED
    FACILITY_CONFIRMATION_PENDING --> REROUTING_REQUIRED

    ACCEPTED --> APPOINTMENT_BOOKED

    TRIAGED --> URGENT_ESCALATION : high risk
    URGENT_ESCALATION --> FACILITY_ALERTED
    FACILITY_ALERTED --> PATIENT_IN_TRANSIT
    FACILITY_ALERTED --> REROUTING_REQUIRED : capability unavailable

    APPOINTMENT_BOOKED --> PATIENT_IN_TRANSIT
    APPOINTMENT_BOOKED --> MISSED_APPOINTMENT
    MISSED_APPOINTMENT --> APPOINTMENT_BOOKED : rebook
    MISSED_APPOINTMENT --> FAILED_REFERRAL : grace expired

    PATIENT_IN_TRANSIT --> PATIENT_REACHED
    PATIENT_REACHED --> DOCTOR_ASSIGNED
    DOCTOR_ASSIGNED --> CONSULTATION_COMPLETED

    CONSULTATION_COMPLETED --> DIAGNOSTICS_PENDING
    CONSULTATION_COMPLETED --> TREATMENT_COMPLETED : diagnostics not required

    DIAGNOSTICS_PENDING --> DIAGNOSTICS_COMPLETED
    DIAGNOSTICS_COMPLETED --> TREATMENT_COMPLETED

    TREATMENT_COMPLETED --> FOLLOW_UP_PENDING
    FOLLOW_UP_PENDING --> FOLLOW_UP_COMPLETED
    FOLLOW_UP_PENDING --> FAILED_REFERRAL : unresolved threshold

    REROUTING_REQUIRED --> FACILITY_RECOMMENDED
    REROUTING_REQUIRED --> FAILED_REFERRAL : no suitable facility

    TRIAGED --> CANCELLED
    FACILITY_SELECTED --> CANCELLED
```

### State principles

-   The referral lifecycle begins at `TRIAGED`. A database creation
    timestamp (`created_at`) exists on the record but is not itself a
    referral state, and there is no `CREATED` state in this state
    machine.
-   `FACILITY_SELECTED` means the destination facility has been
    selected, not that a doctor has been selected.
-   `FACILITY_CONFIRMATION_PENDING` means the selected facility has
    been asked to confirm capability/slot but has not yet responded.
-   `ACCEPTED` means the facility has confirmed it can handle the
    routine referral.
-   `URGENT_ESCALATION` is used when waiting for routine appointment
    acceptance is inappropriate. It branches directly from `TRIAGED`,
    not from `ACCEPTED` or routine appointment states, so that urgent
    cases never wait behind routine acceptance.
-   `FACILITY_ALERTED` means the receiving facility has been informed of
    the urgent case.
-   `DOCTOR_ASSIGNED` occurs internally at the receiving facility, and
    only after `PATIENT_REACHED` in both the routine and urgent paths.
-   `FAILED_REFERRAL` means the system could not establish a successful
    care outcome within defined rules; it is an intervention signal, not
    a statement about the patient's medical condition.
-   Clinical deterioration discovered after `ACCEPTED` is deliberately
    **not** modeled as an `ACCEPTED --> URGENT_ESCALATION` transition in
    this diagram, because urgent escalation is a clinical-urgency
    pathway that starts at triage, not a routine state-machine edge.
    Post-acceptance deterioration should instead be recorded as an
    exceptional event in `REFERRAL_EVENTS` (e.g. `CLINICAL_DETERIORATION_FLAGGED`)
    that triggers human/facility action, keeping clinical urgency
    (this event) clearly distinct from operational facility failure
    (`REROUTING_REQUIRED`).

Every transition must be:

-   valid,
-   authorized,
-   timestamped,
-   attributed,
-   auditable.

------------------------------------------------------------------------

# 8. Routine Referral Flow

``` mermaid
sequenceDiagram
    participant HW as Health Worker
    participant API as Backend
    participant AI as AI Service
    participant RE as Recommendation Engine
    participant F as Facility
    participant DR as Doctor

    HW->>API: Submit assessment
    API->>AI: Risk triage
    AI-->>API: Risk + flagged factors
    API->>RE: Rank facilities
    RE-->>API: Ranked facilities + explanations
    API-->>HW: Recommendations

    HW->>API: Select facility
    API->>F: Create referral (FACILITY_SELECTED)
    F->>API: Confirm capability (ACCEPTED)
    API->>F: Check appointment/service availability
    F->>API: Confirm slot (APPOINTMENT_BOOKED)
    API-->>HW: Appointment confirmed

    HW->>API: Mark patient in transit
    HW->>API: Mark patient reached
    F->>API: Assign eligible doctor (DOCTOR_ASSIGNED)
    DR->>API: Review patient/referral
    DR->>API: Consultation
    DR->>API: Diagnostics / prescription
    DR->>API: Schedule follow-up
    API-->>HW: Follow-up reminder
    HW->>API: Confirm follow-up
    API->>API: Close referral
```

------------------------------------------------------------------------

# 9. Emergency / High-Risk Flow

A high-risk result is **not an autonomous diagnosis**.

The safety architecture is:

``` text
Assessment
   ↓
Rule-based danger-sign safety layer
   ↓
AI-assisted risk stratification
   ↓
Human review
   ↓
Urgent escalation when warranted
```

For a high-risk operational case:

``` mermaid
flowchart TD
    A[High-risk case identified] --> B[Determine urgency]
    B --> C[Find nearest capable facility]
    C --> D{Live capability available?}

    D -->|Yes| E[Alert receiving facility]
    E --> F[Patient proceeds / care initiated]

    D -->|No| G[Use last verified capability + warning]
    G --> H[Show safest available alternative]
    H --> I[Health worker makes final operational decision]

    F --> J{Facility can handle case?}
    J -->|Yes| K1[Patient reaches facility]
    K1 --> K[Doctor/service assignment]
    J -->|No| L[Rerouting Required]
    L --> M[Next capable facility]
```

The platform does not claim to provide emergency transport or guarantee
admission.

If no live data is available, the system must explicitly say so.

------------------------------------------------------------------------

# 10. Facility Recommendation Architecture

The recommendation engine ranks facilities, not individual doctors.

``` text
Score(facility) =
    w1 * SpecialtyMatch
  + w2 * DistanceScore
  + w3 * DiagnosticAvailability
  + w4 * OperationalAvailability
  + w5 * CapabilityMatch
  + w6 * Doctor/ServiceAvailability
  - w7 * LoadPenalty
  - w8 * StalenessPenalty
```

Factors should be configuration-driven.

### Hard filters

Before scoring, exclude facilities that clearly cannot handle the case:

-   facility closed,
-   required capability completely absent,
-   incompatible emergency capability where urgent,
-   outside supported operational scope.

### Soft ranking factors

Then rank remaining facilities using:

-   specialty,
-   capability,
-   urgency-compatible availability,
-   diagnostics,
-   distance,
-   load,
-   freshness.

### Explanation output

The engine should return structured reasons, for example:

``` json
{
  "facility": "District Hospital",
  "score": 0.87,
  "reasons": [
    "Required specialty available",
    "Required diagnostics available",
    "Emergency capability available",
    "Within urgency window"
  ],
  "availability_verified_at": "timestamp"
}
```

The user interface should translate this into simple language.

Never expose raw model scores as the only explanation.

------------------------------------------------------------------------

# 11. Facility and Doctor Availability

Availability is not binary.

## Facility

A facility has:

-   operational status,
-   service-level capability,
-   diagnostic availability,
-   capacity/load,
-   last verified timestamp.

## Doctor

A doctor has:

-   specialty,
-   current availability,
-   schedule,
-   leave/unavailability,
-   appointment capacity.

### Availability freshness

Every operational availability record should have:

`last_verified_at`

The recommendation engine should penalize or warn on stale data.

Example UI:

> Obstetrics: Available\
> Verified 18 minutes ago

or:

> Availability not recently verified.

This is critical because live facility data can become stale.

------------------------------------------------------------------------

# 12. Doctor Assignment

Doctor assignment occurs **after facility selection**.

``` mermaid
flowchart LR
    A[Referral to Facility] --> B[Check required specialty]
    B --> C[Find eligible doctors]
    C --> D[Filter unavailable doctors]
    D --> E[Check appointment capacity]
    E --> F[Select eligible doctor/service]
    F --> G[Create Doctor Assignment]
```

The facility may choose manually or allow the system to suggest the best
eligible doctor.

The system must never assign:

-   a doctor without the required specialty,
-   a doctor marked unavailable,
-   a doctor outside their permitted facility scope.

------------------------------------------------------------------------

# 13. Offline-First Architecture

The Health Worker Flutter application uses a local protected database
and an outbox.

``` mermaid
flowchart LR
    A[Health Worker Input] --> B[Local Database]
    B --> C[Local Outbox]
    C --> D{Connectivity}
    D -->|Offline| E[Pending Sync]
    D -->|Online| F[Backend API]
    F --> G[Server Transaction]
    G --> H[Server ID / Version]
    H --> I[Local Reconciliation]
```

## Local data

Store only what is necessary for the workflow.

Potentially cached:

-   patient records within authorized scope,
-   assessments,
-   referral summaries,
-   facility capability metadata,
-   availability with timestamp,
-   unsynced writes.

## Outbox

Every write has:

-   local event ID,
-   client/device ID,
-   idempotency key,
-   entity type,
-   operation,
-   creation timestamp,
-   sync state.

## Retry

Use bounded exponential backoff.

The UI shows:

-   Saved locally
-   Sync pending
-   Synced
-   Sync failed --- action required

------------------------------------------------------------------------

# 14. Offline Emergency Mode

If connectivity is unavailable during a high-risk case:

1.  Save assessment locally.
2.  Generate a local correlation/referral ID.
3.  Mark the case `PENDING_SYNC`.
4.  Show last-synced facility capability.
5.  Clearly state that live availability cannot be verified.
6.  Show the safest available facility recommendation from cached
    information.
7.  Do not block urgent care while waiting for internet.
8.  Sync the event when connectivity returns.
9.  Server validates and assigns canonical IDs.
10. Facility receives the referral/alert after synchronization.
11. Any conflict is surfaced rather than silently overwritten.

The app must never claim:

> "Facility has accepted"

while fully offline.

It may say:

> "Last known capability: available --- last verified at 14:20."

------------------------------------------------------------------------

# 15. Synchronization and Conflict Resolution

The server is authoritative for shared operational state.

### Safe conflict policy

Do not use generic last-write-wins for:

-   referral state,
-   appointment allocation,
-   doctor assignment,
-   emergency escalation,
-   clinical records.

Instead:

1.  Detect stale version.
2.  Reject or quarantine conflicting operation.
3.  Preserve both events in audit history.
4.  Reconcile through deterministic business rules.
5.  Ask the user for action when necessary.

For non-critical metadata, last-write-wins may be acceptable if
explicitly documented.

### Idempotency

Retrying the same request must not create:

-   duplicate patients,
-   duplicate referrals,
-   duplicate appointments,
-   duplicate prescriptions.

------------------------------------------------------------------------

# 16. Security Architecture

## Authentication

-   Secure authentication.
-   Short-lived access tokens.
-   Refresh mechanism where required.
-   Passwords hashed using bcrypt/Argon2.
-   Never store plaintext passwords.

## Authorization

RBAC is enforced server-side.

Authorization must also enforce:

-   facility scope,
-   patient consent,
-   caregiver scope,
-   referral relationship,
-   administrative jurisdiction.

## Local security

Because the Health Worker device may contain sensitive data:

-   encrypt local sensitive storage where supported,
-   protect the app with authenticated sessions,
-   automatically lock after inactivity,
-   minimize cached data,
-   support secure logout,
-   avoid storing unnecessary attachments locally.

## Audit

Log:

-   patient record access,
-   referral transitions,
-   triage overrides,
-   prescriptions,
-   doctor assignments,
-   facility status changes,
-   consent changes,
-   caregiver authorization,
-   administrative actions.

Do not put sensitive clinical content unnecessarily into application
logs.

------------------------------------------------------------------------

# 17. Consent and Privacy

Consent is captured for:

-   patient record creation,
-   referral information sharing,
-   caregiver access where applicable.

A patient must be able to understand:

-   what data is collected,
-   why it is used,
-   who may receive it.

Sensitive data uses stricter access controls.

The MVP does not claim legal certification merely because these controls
exist.

------------------------------------------------------------------------

# 18. AI Architecture

``` mermaid
flowchart LR
    A[Symptoms / Vitals] --> B[Validation]
    B --> C[Rule-based Safety Layer]
    C --> D[Feature Preparation]
    D --> E[ML Risk Model]
    E --> F[Risk + Flagged Factors]
    F --> G[Human Review]
    G --> H[Facility Recommendation]
```

## Safety hierarchy

The rule-based safety layer has priority over the ML model for defined
danger signs.

If the rule layer detects a critical danger sign:

`Risk = HIGH`

subject to human clinical review.

If the AI service fails:

`Rule-based fallback`

must keep the core workflow operational.

AI does not:

-   diagnose,
-   prescribe,
-   select medication,
-   autonomously determine treatment,
-   autonomously guarantee emergency care.

------------------------------------------------------------------------

# 19. API Architecture

Representative API groups:

  ---------------------------------------------------------------------------------------------------------
  Method            Endpoint                                      Purpose             Roles
  ----------------- --------------------------------------------- ------------------- ---------------------
  POST              `/api/auth/login`                             Login               Public

  POST              `/api/patients`                               Create patient      HW, Patient where
                                                                                      enabled

  GET               `/api/patients/{id}`                          Patient record      Authorized users

  POST              `/api/patients/{id}/assessments`              Assessment          HW

  POST              `/api/triage`                                 AI/rule triage      HW, Doctor

  GET               `/api/facilities/recommended`                 Ranked facilities   HW, Patient where
                                                                                      enabled

  GET               `/api/facilities/{id}`                        Facility detail     Authorized

  GET               `/api/facilities/{id}/availability`           Operational         Authorized
                                                                  availability        

  PATCH             `/api/facilities/{id}/status`                 Update facility     Facility/Admin
                                                                  status              

  GET               `/api/facilities/{id}/doctors/availability`   Eligible doctor     Facility/authorized
                                                                  availability        

  POST              `/api/referrals`                              Create referral     HW/authorized

  GET               `/api/referrals/{id}`                         Referral detail     Authorized

  POST              `/api/referrals/{id}/urgent-escalation`       Trigger urgent      HW/authorized
                                                                  escalation          

  POST              `/api/referrals/{id}/reroute`                 Reroute             Authorized/system

  PATCH             `/api/referrals/{id}/status`                  State transition    Authorized actors

  POST              `/api/appointments`                           Book slot           HW/Facility

  PATCH             `/api/appointments/{id}`                      Cancel/reschedule   Authorized

  POST              `/api/referrals/{id}/assignment`              Assign doctor       Facility

  GET               `/api/doctor/referrals`                       Doctor queue        Doctor

  POST              `/api/consultations`                          Record consultation Doctor

  POST              `/api/prescriptions`                          Create prescription Doctor

  POST              `/api/diagnostics`                            Diagnostic          Doctor/authorized
                                                                  order/result        

  POST              `/api/followups`                              Schedule follow-up  Doctor

  GET               `/api/followups/pending`                      Pending follow-ups  HW

  POST              `/api/sync`                                   Synchronize offline HW client
                                                                  events              

  GET               `/api/admin/dashboard`                        Aggregated KPIs     Admin

  GET               `/api/audit-logs`                             Audit trail         Admin
  ---------------------------------------------------------------------------------------------------------

Every endpoint must enforce authorization server-side.

------------------------------------------------------------------------

# 20. API State-Transition Rules

The client should not be allowed to arbitrarily PATCH any status.

Instead:

``` text
POST /referrals/{id}/events
```

or an equivalent command-based API can represent actions.

Examples:

``` text
selectFacility
confirmFacility
bookAppointment
markPatientInTransit
markPatientReached
assignDoctor
triggerUrgentEscalation
triggerReroute
completeConsultation
completeDiagnostics
completeTreatment
scheduleFollowUp
completeFollowUp
```

The backend validates whether the actor and current state permit that
command.

------------------------------------------------------------------------

# 21. Notifications

Notification abstraction:

``` mermaid
flowchart LR
    A[Domain Event] --> B[Notification Module]
    B --> C[In-App]
    B --> D[Push / FCM]
    B --> E[SMS Optional]
```

Critical events should remain visible inside the application even if
push/SMS fails.

Examples:

-   new referral,
-   facility acceptance,
-   rerouting,
-   missed appointment,
-   follow-up due,
-   emergency escalation.

Notifications should never be the sole source of truth.

------------------------------------------------------------------------

# 22. Maps and Routing

Use OpenStreetMap/OSRM where route/distance calculation materially
improves facility ranking.

Fallback:

`OSRM unavailable → haversine distance`

The referral flow must not fail simply because the external routing
service is unavailable.

------------------------------------------------------------------------

# 23. Object Storage

Use object storage only for files such as:

-   prescription PDFs,
-   diagnostic documents,
-   permitted uploads.

Do not use object storage as the primary store for structured clinical
records.

For MVP, MinIO/S3 can be optional if file storage requirements remain
small.

------------------------------------------------------------------------

# 24. Interoperability

Internal entities should map conceptually to:

-   Patient
-   Observation
-   Encounter
-   ServiceRequest
-   DiagnosticReport
-   MedicationRequest

The MVP does not claim live ABDM integration.

Future integration should occur through authorized government processes
and compatible APIs.

------------------------------------------------------------------------

# 25. Deployment Architecture

## Recommended MVP local development

Keep local development simple.

``` text
MacBook
 ├── Flutter app
 ├── Spring Boot backend
 ├── FastAPI AI service
 └── PostgreSQL / Supabase
```

Docker may be used for reproducibility, but the project should not
depend on Docker expertise for basic development.

## Pilot deployment

``` mermaid
graph TD
    A[Flutter Client] --> B[HTTPS / Reverse Proxy]
    B --> C[Backend]
    C --> D[(Managed PostgreSQL / Supabase)]
    C --> E[FastAPI AI]
    C --> F[Notification Provider]
    C --> G[Object Storage]
    C --> H[Maps Provider]
```

Redis is optional until there is a demonstrated requirement for:

-   rate limiting at scale,
-   distributed caching,
-   background job coordination.

------------------------------------------------------------------------

# 26. Technology Stack

  -----------------------------------------------------------------------
  Layer                   MVP Choice              Notes
  ----------------------- ----------------------- -----------------------
  Mobile                  Flutter + Dart          Android-first; one
                                                  codebase

  Admin                   Flutter Web or          Same backend APIs
                          lightweight web client  

  Backend                 Java 21 + Spring Boot   Modular monolith

  AI                      Python + FastAPI        Separate ML service

  Database                PostgreSQL, optionally  Relational source of
                          managed through         truth
                          Supabase                

  Local storage           SQLite-based Flutter    Protected offline store
                          solution                

  Notifications           FCM                     Push notifications

  Maps                    OpenStreetMap + OSRM    With haversine fallback

  File storage            S3-compatible storage   MinIO locally or
                                                  managed storage

  Containerization        Docker optional for     Do not block
                          local, useful for       development
                          deployment              

  CI/CD                   GitHub Actions          Build/test/deploy

  Cache                   Optional Redis          Add when justified
  -----------------------------------------------------------------------

### Why PostgreSQL remains the database

Supabase does not replace PostgreSQL as the underlying database.

A Supabase-based deployment can provide:

-   managed PostgreSQL,
-   authentication services if desired,
-   storage,
-   APIs,
-   operational tooling.

The application architecture should still treat PostgreSQL as the
relational source of truth.

------------------------------------------------------------------------

# 27. Scalability

## MVP

Use:

-   modular monolith,
-   one primary PostgreSQL database,
-   separated AI service,
-   simple notification adapter.

## District scale

Add:

-   database optimization,
-   indexes,
-   caching where measured,
-   background jobs,
-   stronger monitoring,
-   read replicas only if required.

## State scale

Potentially extract:

-   AI service,
-   notification service,
-   recommendation engine,
-   analytics pipelines.

Do not prematurely split them during MVP.

------------------------------------------------------------------------

# 28. Observability

Minimum:

-   structured logs,
-   request/error metrics,
-   referral transition metrics,
-   AI latency,
-   AI failure/fallback count,
-   sync failure count,
-   appointment conflict count,
-   notification failure count.

Never log unnecessary patient-identifiable clinical information.

Health endpoints:

``` text
/backend/health
/ai/health
```

------------------------------------------------------------------------

# 29. Failure-Mode Architecture

  Failure                    System behavior
  -------------------------- -----------------------------------------------
  AI unavailable             Rule-based fallback
  Internet unavailable       Local queue for Health Worker
  Maps unavailable           Haversine fallback
  Notification unavailable   In-app status remains authoritative
  Facility unavailable       Exclude/deprioritize + reroute
  Doctor unavailable         Do not assign; select another eligible doctor
  No doctor available        Show operational limitation + next option
  Diagnostic unavailable     Re-rank facility / capability warning
  Appointment slot lost      Transaction conflict → rebook
  Sync conflict              Preserve events; reconcile safely
  Duplicate patient          Match warning + controlled merge
  Backend unavailable        Offline Health Worker mode where supported
  Stale facility data        Display freshness + penalize/warn
  No suitable facility       Escalate to human/admin workflow

------------------------------------------------------------------------

# 30. Architecture Boundaries

Explicitly out of MVP architecture:

-   autonomous AI diagnosis,
-   autonomous prescribing,
-   ambulance dispatch,
-   full hospital management,
-   billing,
-   bed-management system,
-   blockchain,
-   nationwide HIE,
-   live ABDM exchange,
-   full telemedicine platform,
-   Kubernetes,
-   unnecessary microservices,
-   real-time clinical decision automation.

------------------------------------------------------------------------

# 31. Architecture Acceptance Criteria

The architecture is considered ready for implementation when:

1.  Each role has a clearly bounded workflow.
2.  Health Worker workflow remains usable during connectivity loss.
3.  Referral destination is a facility.
4.  Doctor assignment is internal to the receiving facility.
5.  Facility and doctor availability are separately modeled.
6.  Availability freshness is represented.
7.  Emergency flow does not depend on routine appointment acceptance.
8.  Rerouting is represented in the referral state machine.
9.  Offline events use idempotency.
10. Critical conflicts are not silently resolved by last-write-wins.
11. AI failure does not block the core referral workflow.
12. Backend enforces RBAC and facility scope.
13. Sensitive local data is protected.
14. PostgreSQL/Supabase is the authoritative structured data store.
15. The architecture can be run locally without requiring a complex
    cloud stack.
16. The architecture matches PRD.md and MVP.md.
