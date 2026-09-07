# Offline AI Medical First-Aid Assistant

A 100% offline-first native Android application delivering immediate, deterministic first-aid emergency protocols, a local Room/SQLite clinical knowledge base, and an on-device Gemma engine (powered by Google MediaPipe Tasks GenAI).

Built strictly according to the PRD guidelines to ensure zero reliance on cloud APIs, zero invented dosages, and sub-millisecond emergency intervention.

---

## Key Highlights & Architectural Guarantees

1. **Deterministic Emergency Precedence (0ms Latency)**:
   - Acute life-threatening situations (CPR, Choking, Severe Bleeding, Heart Attack, Stroke, etc.) bypass the LLM entirely.
   - Immediate triage routing displays complete, unpaginated, scrollable protocols.
   - **Zero "Next" Buttons**: Responders never have to click buttons or step-gate during life-saving procedures.
   - Mandatory **6-step scene safety & responsiveness check** included on every emergency protocol.

2. **100% Offline & Private (Airplane Mode Ready)**:
   - No external APIs (No OpenAI, Claude, Gemini Cloud, or OpenRouter).
   - No logins, accounts, or telemetry.
   - Functions flawlessly in remote locations, disasters, or flight mode.

3. **Verified Medication Database & Antibiotic Stewardship**:
   - Dosages (Adult & Pediatric) originate **exclusively** from local verified clinical sources (WHO Essential Medicines List & British National Formulary).
   - Explicit guardrails against casual antibiotic prescribing for viral colds/influenza.
   - Offline Drug-Drug Interaction Checker.

4. **Dual AI Inference Architecture**:
   - **Gemma Engine**: MediaPipe Tasks GenAI runtime for on-device Gemma 3 1B INT4 (upgradeable to MedGemma 1.5 4B).
   - **Heuristic Clinical Engine**: Built-in rule-based clinical engine that provides immediate educational answers and first-aid guidance even when model weights are not loaded.

---

## 24 Deterministic Emergency Protocols

1. **Adult CPR**: 30:2 compressions to rescue breaths (100-120 bpm, 5-6 cm depth) or Hands-Only.
2. **Child CPR**: 1 or 2 hands, 2 inches deep, 5 cycles before calling if alone.
3. **Infant CPR**: 2 fingers, 1.5 inches deep, cheek puffs.
4. **Choking (Adult/Child)**: 5 firm back blows alternating with 5 abdominal thrusts (Heimlich).
5. **Choking Infant**: 5 back slaps (head lower than chest) alternating with 5 chest thrusts.
6. **Severe Bleeding & Hemorrhage**: Direct continuous pressure, wound packing, commercial tourniquet protocol.
7. **Burns & Scalds**: 20 minutes cool running tap water, clean loose covering. What NOT to do (no butter, ice).
8. **Unconsciousness**: Airway evaluation, Recovery Position, continuous breathing checks.
9. **Suspected Heart Attack**: Semi-recumbent rest, 300 mg chewable aspirin protocol, emergency dispatch.
10. **Suspected Stroke (FAST)**: Face drooping, Arm weakness, Speech difficulty, Time to call emergency.
11. **Seizure (Convulsions)**: Head cushioning, clearing hazards, recovery position after spasms, no mouth objects.
12. **Anaphylaxis**: Intramuscular Epinephrine Auto-Injector (EpiPen) into outer mid-thigh, supine positioning.
13. **Poisoning & Ingestion**: Container identification, Poison Control, anti-emetic warnings (do not induce vomiting).
14. **Heat Stroke**: Rapid whole-body cooling (cold water immersion, ice packs to neck/groin/armpits).
15. **Heat Exhaustion**: Shade, elevation, slow electrolyte sips.
16. **Hypothermia**: Gentle rewarming of core, dry wool/fleece insulation, gentle handling.
17. **Electric Shock**: Power isolation safety first, non-conductive separation, entry/exit burn care.
18. **Fractures & Broken Bones**: Immobilization in position found, splinting above/below joint, circulation checks.
19. **Sprains & Strains (R.I.C.E.)**: Rest, Ice (20 min), Compression bandage, Elevation above heart.
20. **Cuts & Minor Wounds**: Direct pressure, potable water irrigation, antiseptic, tetanus booster check.
21. **Nosebleed (Epistaxis)**: Sitting forward, pinching soft nostrils for 10-15 min continuous, no head tilt.
22. **Fainting (Syncope)**: Supine positioning, legs elevated 12 inches (30 cm), fresh air.
23. **Asthma Attack**: Upright posture, 4 puffs blue reliever inhaler (Salbutamol) via spacer, 4-minute evaluation.
24. **Drowning & Submersion**: 5 initial rescue breaths first, then standard 30:2 CPR compressions.

---

## Technical Architecture

```
app/src/main/java/com/offlinehealth/firstaid/
├── ui/
│   ├── theme/               # Color, Typography, Shape, Theme
│   ├── navigation/          # NavHost, BottomBar, Screen routes
│   ├── home/                # Quick triage, quick-action emergency grid, search bar
│   ├── chat/                # Hybrid conversational assistant (Local DB + Gemma)
│   ├── emergency/           # Continuous unpaginated emergency protocol viewer
│   ├── medication/          # Drug search, warnings, contraindications, interactions, antibiotic guide
│   ├── settings/            # Offline model management, storage diagnostics, database metadata
│   └── components/          # OfflineTopBar, EmergencyProtocolView, SafetyDisclaimer
├── domain/
│   ├── model/               # MedicalCondition, Medication, EmergencyProtocol, SafetyTriageResult
│   ├── protocol/            # 24 Deterministic emergency protocol definitions
│   ├── triage/              # Rule-based emergency keyword detector & intent classifier
│   └── medical/             # Drug interaction validator & antibiotic safety rules
├── data/
│   ├── database/            # AppDatabase (Room), TypeConverters
│   │   ├── dao/             # ProtocolDao, MedicationDao, ConditionDao, InteractionDao, WarningDao
│   │   └── entity/          # Room entities with source metadata & verified dates
│   ├── repository/          # EmergencyRepository, MedicalRepository, ChatRepository
│   └── seed/                # Offline pre-populated medical, interaction, and first-aid data
├── ai/
│   ├── LocalLLMEngine.kt    # Abstract offline LLM interface
│   ├── GemmaEngine.kt       # MediaPipe Tasks GenAI on-device inference implementation
│   ├── HeuristicLocalEngine # 100% offline rule-based fallback when model file is absent
│   ├── ModelManager.kt      # Local model discovery, verification, RAM safety checks & status flow
│   └── PromptBuilder.kt     # RAG prompt constructor fusing query with local DB context & safety bounds
└── safety/
    ├── EmergencyDetector.kt # High-confidence regex/keyword triage interceptor
    └── SafetyPolicy.kt      # Output post-processor enforcing medical disclaimers, no invented doses
```

---

## How to Install the APK

The debug APK has been compiled and is ready:
- **File Location**: `app/build/outputs/apk/debug/app-debug.apk`

### Option A: Install via ADB (Physical Device or Emulator)
1. Connect your Android phone with **USB Debugging** enabled.
2. Run:
   ```bash
   adb install -r "app/build/outputs/apk/debug/app-debug.apk"
   ```

### Option B: Direct File Transfer
1. Copy `app-debug.apk` to your phone via USB cable, Google Drive, or local storage.
2. Tap the file in your phone's File Manager and select **Install**.

---

## On-Device Gemma Model Placement (Optional)

The application functions completely without the model file thanks to the built-in clinical database and heuristic engine. To enable local generative LLM capabilities:

1. Obtain a MediaPipe-compatible Gemma model binary:
   - Target: `gemma-3-1b-it-int4.bin` (or `gemma-2b-it-cpu-int4.bin` / `model.task`)
2. Push the model to the device:
   ```bash
   adb push gemma-3-1b-it-int4.bin /sdcard/Download/
   ```
   Or place it inside the app's files directory:
   `/data/data/com.offlinehealth.firstaid/files/models/`
3. Open **Settings** in the app and tap **Re-Scan Model Storage**.
4. Future upgrade path: `medgemma-1.5-4b-int4.bin` can be placed in the same folder for higher-end devices.
