# 📱 SwasthyaSetu (स्वास्थ्य सेतु) Frontend Application

This is the React + Vite frontend for **SwasthyaSetu** — AI-Assisted Rural Healthcare Coordination & Closed-Loop Referral Platform.

---

## 🚀 Key Modules & Pages

1. **Closed-Loop Referral Tracking** (`/referrals`):
   - 13-state machine progress bar tracking patients from Triage to Follow-up completion.
2. **Facility Smart Matching & Directory** (`/facilities`):
   - Multi-tier public health facilities (PHCs, CHCs, Sub-District, District, Tertiary Hospitals) with real-time operational load meter (0–100%) and 24x7 emergency tags.
3. **AI Clinical Triage & Risk Stratification** (`/triage`):
   - Clinical vitals evaluation (BP, SpO2, Pulse, Temp, Respiration, Pregnancy) with explainable risk flags.
4. **Health Authority & MSInS Oversight** (`/admin`):
   - District-level referral completion KPIs and cryptographic SHA-256 security audit ledger.
5. **Patient EHR & Document AI Analyzer** (`/records`):
   - Lab report interpretation, Gemini multimodal analysis, and longitudinal record viewer.
6. **Guardian AI Drug Safety Check** (`/services`):
   - Allergy and drug-interaction checking against patient medical history.
7. **Caregiver & Family Health Circle** (`/family`):
   - Scoped caregiver access and family member health monitoring.
8. **Doctor Clinical Workflow** (`/doctor/dashboard`, `/doctor/prescribe`, `/doctor/diagnosis`):
   - Doctor dashboard, patient history, PDF prescription generation, and diagnostic ordering.

---

## 🛠️ Tech Stack

- **React 19**
- **Vite 7**
- **Supabase JS Client**
- **Framer Motion** (Animations & Transitions)
- **Lucide Icons**
- **Axios**

---

## 💻 Running the Frontend

```powershell
npm install
npm run dev
```

App will run at **http://localhost:3000**.
