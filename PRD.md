# Product Requirements Document

## Product Name

**SwasthyaSetu**
*"AI-Assisted Rural Healthcare Coordination & Closed-Loop Referral Platform"*

**Problem Statement ID:** 26133 | **Organization:** Government of Maharashtra | **Department:** Maharashtra State Innovation Society (MSInS), Department of Skills, Employment, Entrepreneurship and Innovation | **Theme:** MedTech / HealthTech

**Revision note:** This is a revised PRD. It preserves the core differentiator (closed-loop referral tracking) and extends the product to support patient self-service, caregiver-assisted access, facility-centric referrals with internal doctor assignment, doctor/facility availability modeling, routine-vs-emergency routing, and an offline-first, connectivity-aware Health Worker experience. See the Change Log (companion document) for a full diff against the prior version.

---

## 1. Executive Summary

SwasthyaSetu is a care-coordination platform designed to close the biggest gap in rural public healthcare delivery: **the referral black hole**. Patients in rural Maharashtra frequently move between sub-centres, PHCs, rural hospitals, and district hospitals with no continuity of information and no accountability for whether a referral actually resulted in care. SwasthyaSetu addresses this by combining AI-assisted risk triage, facility-centric smart matching, and — most importantly — a **closed-loop referral tracking system** that follows every patient from initial assessment through to confirmed follow-up completion.

The platform now explicitly supports **two parallel entry routes** — Health-Worker-assisted (the primary route for low-literacy, low-device-access, or vulnerable patients) and **patient self-service** (for patients capable of describing their own symptoms and navigating the app) — with an optional lightweight **Caregiver** relationship for family-assisted use. Referrals are made to a **facility**, not to an individual doctor; the facility is responsible for internally assigning an appropriate, available doctor. The system distinguishes **facility capability** (can this facility, in principle, treat this condition) from **real-time operational availability** (can it do so right now, within the required urgency window), and explicitly models **routine** versus **urgent/emergency** referral flows so that a high-risk case is never left waiting on routine appointment confirmation. The Health Worker experience is offline-first by design, including a defined behavior for the hardest case — an emergency assessed with no connectivity.

SwasthyaSetu is explicitly designed to strengthen the existing public health system (ASHA workers, PHCs, government hospitals) rather than replace it, and remains architecturally compatible with ABDM/FHIR standards without claiming integrations that are not actually built. AI remains strictly **decision support** — risk stratification and facility ranking — never diagnosis, prescription, or autonomous clinical decision-making.

## 2. Problem Statement

*(As per official Smart India Hackathon 2026 Problem Statement 26133, Government of Maharashtra)*

Rural and underserved communities face long travel distances, shortages of specialists, irregular diagnostics, fragmented medical records, delayed referrals, and limited awareness of available services. Primary health facilities often operate with constrained staff and equipment, and patients move between sub-centres, PHCs, rural hospitals, and district hospitals without continuity of information. Connectivity, language, health literacy, and affordability further affect access. The challenge is to improve timely access, continuity, quality, and accountability — while strengthening, not replacing, the public health system.

## 3. Problem Analysis

| Dimension | Manifestation | How SwasthyaSetu Addresses It (MVP scope noted) |
|---|---|---|
| **Accessibility** | Long travel distances, unclear which facility to visit | Facility-centric smart recommendation by specialty, distance, real-time availability (MVP) |
| **Specialist shortage** | Patients travel to wrong-tier facilities or wait indefinitely for a specific doctor | Doctor availability model + internal facility assignment, so the patient is matched to *a* capable doctor, not a named one (MVP) |
| **Fragmented records** | No continuity between facility visits | Longitudinal patient record within the platform (MVP, single-platform scope) |
| **Referral failure** | Referrals created but never tracked to completion | Facility-centric closed-loop referral state machine (MVP — core differentiator) |
| **Diagnostic availability** | Patients travel to facilities lacking required tests | Facility diagnostic-capability + real-time availability tagging feeds into referral scoring (MVP) |
| **Mediated-only access** | Capable patients forced through a health worker for every interaction | Patient self-service route added as a parallel, non-mandatory path (MVP, scoped safely) |
| **Low digital literacy / no smartphone** | Some patients cannot use an app directly | Health-Worker-assisted route remains primary; Caregiver-assisted route added (MVP) |
| **Emergency delay** | Patients wait on routine confirmation even when high-risk | Explicit urgent-escalation flow that alerts a capable facility without blocking on appointment acceptance (MVP) |
| **Stale facility data** | Availability shown is not actually current | Data-freshness timestamps + stale-data warnings on every availability display (MVP) |
| **Low connectivity** | Rural areas have intermittent network access | Offline-first data capture with sync, including a defined offline-emergency behavior (MVP, hardened in Phase 2) |
| **Language barriers** | Health workers/patients more comfortable in Marathi/Hindi | Multilingual UI + voice input (Should-Have) |
| **Accountability** | No visibility into system performance for administrators | Admin dashboard with referral completion KPIs (MVP) |

## 4. Target Users

### Persona 1: Rural Patient — "Meena, 27, pregnant homemaker"
Lives 12 km from the nearest PHC, limited literacy, primary language Marathi, owns a basic smartphone shared with family. Primarily uses the **Health-Worker-assisted route**; may occasionally check referral status herself if literate enough, or via a family caregiver.

### Persona 1b: Self-Service-Capable Patient — "Rahul, 34, small shop owner"
Owns a personal smartphone, moderate digital literacy, lives near a PHC catchment but sometimes travels for work. Uses the **Patient Self-Service route**: registers himself, describes symptoms, sees recommended facilities, and tracks his own referral — without a Health Worker in the loop for every step.

### Persona 1c: Caregiver — "Suresh, 45, son of an elderly patient"
Manages healthcare logistics for his elderly mother, who has low digital literacy. With his mother's consent, he views her appointment status, receives reminders, and helps her follow up — without unrestricted access to her full clinical record.

### Persona 2: ASHA / Health Worker — "Sunita, 34, ASHA worker"
Covers ~1,000 people across several villages, handles 15–20 patient visits a day, has basic smartphone literacy, works in areas with patchy connectivity. Needs a fast, low-friction registration/assessment flow that works fully offline, gives her confidence in triage decisions, and never leaves her stuck when a case is urgent and she has no signal.

### Persona 3: PHC Doctor — "Dr. Patil, Medical Officer at a PHC"
Sees 40–60 patients a day, has limited time per patient, needs quick access to patient history and an efficient way to record consultations and issue referrals/prescriptions without duplicate paperwork. Receives referrals **assigned to him by his facility**, not routed to him individually by the referring health worker.

### Persona 4: Specialist / District Hospital Doctor — "Dr. Kulkarni, Obstetrician at District Hospital"
Receives referrals assigned to her facility and internally routed to her based on her specialty and current availability status. Needs prioritized visibility into incoming high-risk cases, and a way to close the loop back to the referring facility once treatment is complete.

### Persona 4b: Facility Coordinator — "Ganesh, front-desk/operations staff at District Hospital"
Manages the facility's day-to-day operational picture: which doctors are available, whether diagnostics are running, current appointment capacity, and confirming patient arrival. Assigns incoming facility-level referrals to an appropriate available doctor.

### Persona 5: District Administrator — "Mr. Deshmukh, District Health Officer"
Responsible for oversight across dozens of facilities, needs aggregate visibility into referral completion, bottleneck facilities, and high-risk patient follow-up — without needing to review individual case files.

## 5. Product Goals

**Primary Goals:**
- Ensure every referral is tracked to a definitive outcome (completed, failed, or cancelled) — eliminating the "referral black hole."
- Provide AI-assisted risk triage that helps health workers and self-service patients make faster, more consistent decisions without replacing clinical judgment.
- Match patients to the most appropriate **facility** based on specialty, distance, real-time operational availability, and diagnostic capability — with the facility responsible for internal doctor assignment.
- Ensure a high-risk/emergency case is never trapped waiting on routine appointment confirmation.
- Support a capable patient in navigating the system independently, without becoming an autonomous diagnosis app.

**Secondary Goals:**
- Improve continuity of care for maternal, child, and chronic-condition follow-ups.
- Give administrators actionable visibility into system-wide referral performance.
- Allow a designated caregiver to assist a patient with low digital literacy, under explicit, revocable consent.
- Build the platform in a way that is architecturally ready for ABDM/FHIR interoperability in future phases.

## 6. Non-Goals

- Replacing ABDM, eSanjeevani, or any existing government health IT system.
- Providing autonomous AI medical diagnosis, to a patient or anyone else.
- Building a full hospital management system (billing, bed management, inventory).
- Real-time ambulance dispatch or emergency transport logistics.
- Guaranteeing emergency care or claiming the app is a substitute for calling emergency services.
- Nationwide or multi-state deployment within the hackathon/MVP timeframe.
- A fully independent caregiver clinical role with unrestricted record access.

## 7. Product Scope

| Scope | Included |
|---|---|
| **MVP** | Patient registration (Health-Worker-assisted **and** self-service), assessment capture, AI triage, facility-centric smart recommendation with real-time availability, referral creation, internal doctor assignment, appointment booking, routine and urgent/emergency referral flows, doctor consultation & prescription, closed-loop referral tracking, follow-up reminders, offline-first Health Worker mode incl. offline-emergency handling, caregiver-authorized access, basic admin dashboard, auth/RBAC |
| **Phase 2 (pilot-readiness)** | Multilingual UI, voice input, hardened offline sync/conflict handling, diagnostic/medicine availability visibility, SMS notification fallback, facility staff role tooling, assisted teleconsultation (basic) |
| **Future** | Real ABDM/eSanjeevani integration, predictive analytics (medicine demand forecasting, outbreak signals), state-wide deployment, expanded caregiver tooling |

## 8. Functional Requirements

| ID | Requirement |
|---|---|
| FR-001 | System shall support role-based authentication (Patient, Caregiver, Health Worker, Doctor, Facility Staff, Admin) via secure login. |
| FR-002 | System shall allow a Health Worker to register a new patient with deduplication check against existing records. |
| FR-002a | System shall allow a Patient to self-register and create/access their own profile, with the same deduplication check applied. |
| FR-003 | System shall allow health workers (or the patient directly, in self-service) to record symptoms and vitals via structured form and/or voice input. |
| FR-004 | System shall generate an AI-assisted risk triage output (Low/Medium/High) with explainable flagged factors, given assessment data. |
| FR-005 | System shall allow a doctor or health worker to override the AI triage result with a mandatory reason. Patients in self-service cannot override AI output — they can only proceed per the system's recommended action. |
| FR-006 | System shall recommend ranked **facilities** based on specialty match, distance, diagnostic availability, real-time operational availability, appointment availability, and facility capability. The system shall never recommend an individual doctor to the referring user. |
| FR-007 | System shall allow the referral (already established at `TRIAGED`, the point at which triage determined a referral is needed) to be linked to a selected **facility**, not against an individual doctor. |
| FR-007a | Once a referral is accepted by a facility and the patient has physically reached the facility (`PATIENT_REACHED`), the facility (via Facility Staff or an automated eligible-doctor rule) shall internally assign an appropriate, available doctor. Doctor assignment is not required, and should not be presented to the user as required, before the patient has traveled to and arrived at the facility. |
| FR-008 | System shall allow booking of an appointment slot at the referred facility, linked to the referral, using atomic/transaction-safe booking logic to prevent double-booking. |
| FR-008a | System shall distinguish, in the referral's visible status, between an appointment being booked, the patient being in transit to the facility (`PATIENT_IN_TRANSIT`), and the patient having physically arrived (`PATIENT_REACHED`), so the health worker/patient and receiving facility always know which of these has actually occurred. |
| FR-009 | System shall notify the receiving facility of a new incoming referral, and separately notify the assigned doctor once assignment occurs. |
| FR-010 | System shall allow a facility (via Facility Staff or Doctor) to decline a referral with a reason, triggering automatic rerouting to the next-ranked facility. |
| FR-011 | System shall allow a doctor to record a consultation note against a referral/patient. |
| FR-012 | System shall allow a doctor to issue a digital prescription linked to the consultation. |
| FR-013 | System shall allow diagnostics to be ordered and results (or "not required") logged against the referral. |
| FR-014 | System shall enforce a referral state machine (see Section 15 companion state model) with valid transitions only, distinguishing routine and urgent-escalation paths. |
| FR-015 | System shall log every referral state transition with timestamp, actor, and triggering event. |
| FR-016 | System shall allow a doctor to schedule a follow-up date, generating a reminder task. |
| FR-017 | System shall send a follow-up reminder to the responsible health worker (and, where authorized, the patient/caregiver) on/before the scheduled date. |
| FR-018 | System shall flag a referral as `MISSED_APPOINTMENT` if the patient does not arrive within a defined grace window, and allow rebooking. |
| FR-019 | System shall flag a referral as `FAILED_REFERRAL` if unresolved beyond a defined threshold after `MISSED_APPOINTMENT` or expired follow-up window. |
| FR-020 | System shall provide an admin dashboard showing referral completion rate, average processing time, and follow-up completion rate, filterable by facility and date range. |
| FR-021 | System shall maintain an audit log of all data-modifying actions for accountability. |
| FR-022 | System shall support viewing a patient's longitudinal assessment/consultation history within the platform, scoped by role. |
| FR-023 | System shall display facility diagnostic and (where available) medicine-availability status to health workers/patients during facility selection, including a data-freshness indicator. |
| FR-024 | System shall display each doctor's/facility's operational availability status and, where a required capability is unavailable, shall clearly state this rather than implying availability. |
| FR-025 | System shall support a Caregiver relationship: a patient may authorize a caregiver with a defined, revocable access scope (appointment status, reminders, limited status view) — never full clinical record access without separate explicit consent per record. |
| FR-026 | System shall support urgent escalation: for High-risk/emergency triage, the system shall identify the nearest capable facility, alert it, and allow the health worker/patient to proceed without waiting for routine appointment confirmation. |
| FR-027 | System shall support offline capture of registration, assessment, and referral-preparation data by the Health Worker app, including an explicit offline-emergency mode (Section 14, Edge Cases). |
| FR-028 | System shall distinguish, in the UI, between verified live data, last-synced cached data, and pure offline/unverified data. |
| FR-029 | System shall support Hindi, Marathi, and English UI language selection. *(Should-Have)* |
| FR-030 | System shall queue data entered offline and synchronize when connectivity is restored, using idempotency keys and server-as-source-of-truth conflict resolution for referral-critical fields (never silent last-write-wins on clinical/state-critical data). *(MVP for core offline capture; hardened sync/conflict UX is Phase 2)* |

## 9. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Security** | All API traffic over TLS; passwords hashed (bcrypt/Argon2); JWT-based session management with expiry and refresh. |
| **Privacy** | Role-based access control ensures users see only data relevant to their role/facility/authorization scope; sensitive medical data access is logged. Caregiver access is scoped and revocable. |
| **Availability** | Target 99% uptime for core referral/consultation flows during pilot; graceful degradation (offline queueing) during connectivity loss. |
| **Scalability** | Modular monolith designed so components (AI service, notification service) can be extracted into separate services if load requires it. |
| **Performance** | Core screens load within 3 seconds on 3G-equivalent connectivity; AI triage response within 5 seconds. |
| **Accessibility** | UI designed for low-literacy users (icon-forward, voice input support); Material 3 accessibility guidelines followed; patient-facing language is plain-language, never technical (no exposed state-machine names, confidence scores, or model probabilities). |
| **Multilingual support** | UI and key notifications available in Hindi, Marathi, English (Should-Have, targeted for pilot readiness). |
| **Offline-first capability** | Health worker app functions with local storage and syncs when connectivity resumes, including a defined offline-emergency path (MVP). |
| **Local data security** | Locally cached clinical data is encrypted at rest on-device, scoped to the minimum necessary, subject to session auto-lock, and access-controlled if the device is lost (Section 13/companion architecture). |
| **Auditability** | Every state-changing action (referral transitions, prescriptions, overrides, caregiver access grants/revocations) is logged with actor, timestamp, and reason where applicable. |
| **Interoperability** | Data models designed with FHIR resource concepts in mind (Patient, Encounter, Condition, ServiceRequest) to ease future ABDM alignment — not claimed as live integration in MVP. |

## 10. AI Requirements

**What the AI does:**
- Performs symptom/vitals-based **risk stratification** (Low/Medium/High), not diagnosis — for both Health-Worker-assisted and Patient Self-Service routes.
- Provides **explainable output** — which inputs contributed to the risk level, and (for facility recommendation) *why* a facility was ranked highest, in plain language, not a raw score.
- Supports **speech-to-text** for symptom capture in supported languages (Should-Have).
- Assists **facility scoring** by contributing risk severity and urgency classification as inputs to the referral engine.
- Classifies urgency (routine vs. requires urgent escalation) as a decision-support signal, not an autonomous dispatch trigger.

**What the AI does NOT do:**
- Does not name or suggest a specific disease/diagnosis, to a health worker, doctor, **or a self-service patient**.
- Does not prescribe medication or dosages.
- Does not make an unreviewable, final clinical decision — every AI output is subject to human (health worker/doctor) confirmation or override; a self-service patient sees the recommended action but cannot alter the risk classification.
- Is not used for any emergency/life-critical **autonomous** decision-making — a human-alertable escalation is triggered, but the system never claims to dispatch care.
- Does not guarantee that a recommended facility can currently treat the patient — this is explicitly gated by real-time availability data with freshness indicators (Section 8/companion architecture).

**Model approach:** Rule-based clinical heuristics (e.g., standard vital-sign thresholds, danger-sign checklists commonly used in community health worker protocols) combined with a lightweight supervised classifier (e.g., gradient-boosted trees) trained on structured, clearly-sourced, non-fabricated data where available; the system defaults to rule-based conservative behavior when ML confidence is low or data is insufficient. This applies identically regardless of entry route (Health Worker or self-service).

**Patient self-service AI output framing (safety rule):** A self-service patient never receives "You may have condition X." They receive a plain-language message such as: *"Your responses indicate you may need medical attention. We recommend visiting [recommended facility]."* For High-risk output, the message strongly recommends urgent professional evaluation and surfaces the urgent-escalation flow.

## 11. Healthcare Data & Privacy

- **Consent:** Patient (directly, in self-service; or via accompanying guardian/health worker in assisted mode) consent is captured at registration for data collection and referral-sharing purposes. Consent can be withdrawn; withdrawal is logged and honored going forward (data already used in an active referral is not retroactively deleted mid-episode, but future collection stops).
- **Caregiver consent:** A patient explicitly authorizes a caregiver relationship, defines its access scope, and can revoke it at any time. Caregiver access is enforced server-side per the authorized scope — never full-record by default.
- **Minimum necessary data:** Only clinically and operationally necessary fields are collected; no unrelated demographic profiling.
- **Encryption:** Data encrypted in transit (TLS) and at rest (database-level encryption for sensitive fields; on-device encryption for offline-cached data).
- **Role-based access:** Enforced at API level — a health worker cannot view patients outside their facility catchment; a doctor sees only referrals assigned to them or unassigned referrals within their facility; a caregiver sees only what the patient authorized.
- **Audit logs:** All access to patient clinical data is logged (who, when, what record, and — for caregivers — under what authorization).
- **Sensitive medical data:** Maternal health, HIV/TB status (if ever captured), and similar categories are treated with elevated access restrictions, and are never exposed to a caregiver by default.
- **Data retention:** Retention policy to be defined in line with applicable government health record guidelines; MVP assumes indefinite retention within the pilot scope with deletion capability on valid request.
- **ABDM/FHIR compatibility:** Data structures are designed to map to FHIR resources (Patient, Encounter, Condition, ServiceRequest, DiagnosticReport) to ease future compatibility. **No claim is made of live ABDM integration, Health ID issuance, or HIE-CM connectivity in the MVP** — this is explicitly a future-phase item.
- **No fabricated compliance claims:** The platform does not claim certifications (e.g., ISO, HIPAA-equivalent Indian certifications) that have not been actually obtained or audited, and does not claim guaranteed emergency-response outcomes.

## 12. User Stories

1. As a health worker, I want to register a new patient in under a minute, so that I can spend more time on assessment than paperwork.
2. As a health worker, I want the system to warn me if a similar patient record already exists, so that I don't create duplicate records.
3. As a health worker, I want to record symptoms by voice in Marathi, so that data entry is fast even when I'm not comfortable typing.
4. As a health worker or self-service patient, I want to see an AI-assisted risk level after entering vitals/symptoms, so that I can make a faster, more confident decision.
5. As a health worker, I want to understand *why* the AI flagged a case as high risk, so that I can explain it to the patient and trust the recommendation.
6. As a health worker, I want to override the AI's risk assessment when my own judgment differs, so that I retain clinical/field authority.
7. As a health worker or patient, I want to see a ranked list of suitable **facilities** (not individual doctors), so that I don't have to guess where to go or which doctor to contact.
8. As a health worker or patient, I want to book an appointment at the recommended facility directly from the app, so that there is a concrete time to travel for.
9. As a health worker or patient, I want to track the status of a referral in plain language, so that I know what's happening and what to do next.
10. As a health worker, I want to be alerted if a patient misses their appointment, so that I can follow up and rebook.
11. As a doctor, I want to see the referrals **assigned to me by my facility**, sorted by urgency, so that I don't have to search the network for cases.
12. As a doctor, I want to view a patient's assessment history before consultation, so that I don't have to start from zero.
13. As a facility coordinator, I want to decline a referral my facility genuinely cannot handle, with a reason, so that the system can reroute it to the next capable facility automatically.
14. As a doctor, I want to record consultation notes and issue a digital prescription, so that there is a clear record of treatment.
15. As a doctor, I want to order diagnostics and log results, so that the full care episode is captured.
16. As a doctor, I want to schedule a follow-up date, so that continuity of care is ensured for the patient.
17. As an administrator, I want to see the overall referral completion rate across my district, so that I can identify systemic issues.
18. As an administrator, I want to filter referral data by facility, so that I can identify which facilities have low completion rates.
19. As an administrator, I want to see average referral processing time, so that I can identify delays in the system.
20. As an administrator, I want to see follow-up completion rates for maternal and chronic-condition cases specifically, so that I can monitor continuity for high-priority categories.
21. As a patient, I want to know which facility I'm being referred to and why, in plain language, so that I understand and trust the process — whether I used the app myself or a health worker did it for me.
22. As a health worker, I want the app to work fully even when I have no internet connection — including for an urgent case — so that I never have to stop caring for a patient because of connectivity.
23. As an administrator, I want to see which referrals have failed, gone unresolved, or were rerouted due to facility unavailability, so that I can intervene proactively.
24. As a capable patient, I want to register and describe my symptoms myself, so that I don't need to wait for a health worker if I don't need one.
25. As a family member, I want to help my elderly parent manage appointments and reminders with their permission, so that they don't miss care, without me seeing their entire medical file.
26. As a health worker or patient, I want a high-risk case to be escalated to a capable facility immediately, without waiting for a routine appointment to be confirmed, so that urgent care is never delayed by process.
27. As a health worker or doctor, I want to see when facility/doctor availability data was last verified, so that I don't act on stale information.

## 13. Acceptance Criteria (Given / When / Then)

**Patient Registration (assisted or self-service)**
- Given a new patient is entered (by health worker or self), When the phone number matches an existing record, Then the system displays the existing record and prompts confirmation rather than duplicating.

**AI Triage**
- Given vitals and symptoms are submitted, When the assessment is saved, Then the system returns a risk level with flagged contributing factors within 5 seconds, along with a decision-support disclaimer appropriate to the entry route (clinical language for Health Worker/Doctor, plain language for self-service Patient).

**Facility Recommendation (facility-centric)**
- Given a Medium or High risk triage result, When the user proceeds to referral, Then the system displays a ranked list of at least one suitable **facility** — never an individual doctor — based on specialty, distance, real-time operational availability, and diagnostics, each with an availability freshness indicator.

**Referral Creation & Tracking**
- Given a triage result indicates a referral is needed, When the assessment is finalized, Then a referral record is established in `TRIAGED` state — this is the start of the referral lifecycle, prior to any facility being selected.
- Given a `TRIAGED` referral needing routine referral, When the user proceeds, Then the system first shows the ranked `FACILITY_RECOMMENDED` list before a facility can be selected — a facility can never be selected directly from `TRIAGED` without this step.
- Given a facility is selected from the `FACILITY_RECOMMENDED` list, When the referral is confirmed, Then the referral transitions to `FACILITY_SELECTED` state and becomes visible to that facility's coordinator/doctor queue.
- Given a referral changes state at any point in its lifecycle, When the transition occurs, Then the system logs the timestamp, actor, and (if applicable) reason, and updates the referral's visible status for the health worker/patient and the receiving facility.

**Patient Travel & Doctor Assignment**
- Given an appointment is booked or an urgent facility has been alerted, When the patient begins traveling to the facility, Then the referral's visible status reflects `PATIENT_IN_TRANSIT`, distinct from a booked-but-not-yet-traveled appointment.
- Given the patient arrives at the facility, When arrival is confirmed (`PATIENT_REACHED`), Then the facility becomes responsible for internally assigning an appropriate, available doctor; the system shall not require or display a named doctor assignment before this point.

**Facility Decline / Rerouting**
- Given a facility declines a referral, When the decline is recorded with a reason, Then the system automatically recalculates and presents the next-ranked capable facility, and logs the rerouting event.

**Urgent Escalation**
- Given a High-risk/emergency triage result, When the user proceeds, Then the system identifies the nearest currently-capable facility, marks the referral `URGENT_ESCALATION` → `FACILITY_ALERTED`, and instructs the user to proceed without waiting for routine appointment confirmation.

**Offline Emergency**
- Given the Health Worker app has no connectivity and a case is assessed as High-risk, When the worker proceeds, Then the app saves all data locally, generates a temporary correlation ID, marks the referral `PENDING_SYNC`, shows the best cached facility recommendation with a clearly labeled "not live-verified" indicator, and instructs the worker not to delay care while waiting for connectivity.

**Missed Appointment Handling**
- Given an appointment date has passed without a `PATIENT_REACHED` confirmation, When the grace period expires, Then the referral automatically transitions to `MISSED_APPOINTMENT` and the originating health worker/patient is alerted.

**Follow-up**
- Given a doctor schedules a follow-up date, When that date arrives, Then a reminder is generated for the responsible health worker (and authorized patient/caregiver), and the referral remains in `FOLLOW_UP_PENDING` until explicitly closed.

**Caregiver Access**
- Given a patient authorizes a caregiver with a defined scope, When the caregiver logs in, Then they see only the authorized subset of information; When the patient revokes authorization, Then the caregiver immediately loses access.

**Admin Dashboard**
- Given an administrator selects a facility and date range, When the dashboard loads, Then it displays referral completion rate, average processing time, follow-up completion rate, and rerouted/failed referral counts for that filter within 3 seconds.

## 14. Edge Cases

| Edge Case | Expected System Behavior |
|---|---|
| No internet connectivity during registration/assessment | Data is stored locally and queued for sync; user is informed of offline status |
| Emergency assessed while Health Worker is offline | Save locally, generate temporary correlation ID, mark `PENDING_SYNC`, show best cached facility with "not live-verified" warning, instruct worker to proceed without waiting for sync |
| Cached facility availability is stale | Availability shown carries a "last verified X minutes ago" timestamp; beyond a configurable threshold, a stale-data warning is shown and the facility is deprioritized, not hidden |
| Required specialty available but no doctor currently on duty | Facility is shown with an explicit "specialty available, no doctor currently on duty — next available [time]" status, not a false "available" |
| Doctor becomes unavailable after referral accepted | Facility reassigns to another eligible doctor; if none exists, referral moves to `REROUTING_REQUIRED` and the next facility is surfaced |
| Facility declines an ordinary referral | Referral automatically reroutes to next-ranked facility; reason logged for audit |
| Facility cannot handle an emergency case | System immediately reroutes to next nearest capable facility and re-alerts; original facility's failure is logged for admin visibility |
| No appointment slot available within urgency window | For routine cases, next-available slot is surfaced and urgency mismatch flagged for manual escalation; for urgent cases, the system does not wait on slot availability — it escalates instead |
| Duplicate patient record detected (assisted or self-service, incl. offline-created duplicates) | System surfaces potential match at registration/sync time; worker/patient chooses to merge or confirm as distinct individual; phone number alone is never treated as a guaranteed identity match |
| Caregiver attempts to access data outside authorized scope | Access denied server-side; attempt is logged |
| Patient self-service gives incomplete symptom data | System proceeds with available data, clearly indicates lower confidence, and defaults toward the conservative (higher-caution) recommendation rather than blocking |
| Patient withdraws consent | Future data collection stops; existing active-episode data is retained per policy; withdrawal is logged |
| Sync conflict: offline referral state vs. server state changed in the meantime | Server is source of truth for referral-critical fields; conflicting local changes are surfaced to the user for reconciliation rather than silently overwritten |
| Notification delivery fails (push unreachable) | Critical referral events remain visible inside the app itself (in-app pending alert), independent of push delivery success |
| Two users attempt to book the same appointment slot | Atomic booking logic ensures only one succeeds; the other sees an immediate "slot no longer available" with alternatives |
| AI triage service unavailable/fails | System falls back to a rule-based minimum triage (danger-sign checklist) and flags that AI service was unavailable, rather than blocking the workflow |
| Doctor/facility rejects referral | Referral returns to facility-recommendation step, excluding the rejecting facility, with reason logged for audit |

## 15. Success Metrics / KPIs

- Referral completion rate (referrals reaching a successful terminal state)
- Average time from referral creation to appointment booking (routine) and to facility-alert acknowledgment (urgent)
- Follow-up completion rate, overall and for maternal/child/chronic-condition cohorts
- Number of `MISSED_APPOINTMENT`, `FAILED_REFERRAL`, and `REROUTED` cases identified (visibility itself is a success metric — previously invisible)
- Proportion of referrals originating via Patient Self-Service vs. Health-Worker-assisted (adoption signal, not a target to maximize either way)
- AI triage response time and override rate (a healthy system will show some override rate, indicating human oversight is active, not indicating failure)
- Rate of referrals recommended against stale (beyond-threshold) availability data (should trend toward zero as facility-data update discipline improves)

## 16. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Health workers resist adopting a new digital workflow | Design for minimal data entry time; involve ASHA/health worker feedback in UI iteration; keep the app fully usable offline |
| Patient self-service is misused/misunderstood as diagnosis | Strict output framing rules (Section 10); no disease naming ever shown to a patient; urgent cases always push toward professional evaluation |
| AI triage produces false negatives (misses a genuinely high-risk case) | Tune model to be conservative (bias toward over-referral); always pair with a rule-based danger-sign safety net; doctor override always available |
| Connectivity issues in deep rural areas break the workflow, especially in an emergency | Offline-first architecture with local queueing, explicit offline-emergency mode, and later sync (MVP baseline, Phase 2 hardening) |
| Facility/doctor availability data becomes stale and misleads recommendations | Data-freshness timestamps, stale-data warnings, and a lightweight facility-editable update workflow rather than assuming automatic accuracy |
| Caregiver access is misused to surveil a patient without real consent | Explicit, scoped, revocable authorization; every access logged; sensitive categories excluded from caregiver view by default |
| Over-claiming AI or emergency-handling capability undermines trust with judges/health authorities | Strict adherence to "decision support, not diagnosis" and "escalation, not guaranteed emergency care" language throughout |
| Scope creep toward a "do everything" platform | Firm MVP boundary (Section 7); explicit Out-of-Scope list maintained across all documents |
| Facility-centric model adds complexity (doctor availability, internal assignment) that the team can't build in time | Smallest viable availability model (few states, one assignment rule); Facility Staff role kept lightweight, not a full HMS |

## 17. Future Opportunities

- Real, certified integration with ABDM (Health ID, HIE-CM) and eSanjeevani for teleconsultation.
- Predictive analytics for medicine demand forecasting at facility level.
- Outbreak/early-warning signal detection from aggregated, anonymized triage data.
- Expanded multilingual and voice capability across more Indian languages.
- Richer caregiver tooling (multi-caregiver coordination, granular per-record consent).
- District-to-state-wide phased deployment with formal MoU with public health authorities.

---

## Implementation Priority

1. Core patient + referral data model, facility-centric referral concept, and RBAC (foundation for everything else)
2. AI triage and closed-loop, facility-centric referral state machine (primary differentiators — build and stabilize first)
3. Facility/doctor availability model, two-stage matching, routine vs. urgent flow
4. Doctor-side consultation, prescription, and follow-up flows
5. Offline-first Health Worker mode incl. offline-emergency handling
6. Patient self-service and Caregiver access
7. Admin dashboard (judge-facing impact story)
8. Should-Have items (multilingual, voice, hardened offline sync) as pilot-readiness enhancements
