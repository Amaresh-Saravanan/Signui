# SignBridge — Feature Ideas & Improvement Suggestions

> **Purpose:** Ideas to make SignBridge a genuinely useful, real-world communication tool.  
> **Last updated:** 2026-07-17  
> **Status:** Unranked backlog — prioritized below by impact vs. effort.

---

## Priority Summary Table

| # | Feature | Effort | Impact |
|---|---|---|---|
| 1 | Deploy trained ML model (M4) | Medium | 🔴 Highest |
| 2 | Speech-to-Text via Web Speech API | Low | 🔴 Highest |
| 3 | Word auto-complete / prediction | Medium | 🔴 Very High |
| 4 | Counter Mode (full-screen transcript) | Low | 🟡 High |
| 5 | Quick phrase bar | Low | 🟡 High |
| 6 | Undo last word | Very Low | 🟡 High |
| 7 | PWA (installable app) | Low | 🟡 High |
| 8 | J/Z motion letter support | High | 🟢 Medium |
| 9 | Landmark confidence heatmap overlay | Medium | 🟢 Medium |

---

## 🔴 Critical — Do These First

### 1. Deploy the Trained ML Model
Replace the current geometric heuristic classifier (`aslClassifier.ts`) with the
trained MediaPipe Model Maker `.task` file (Milestone M4 in `MIGRATION_TRACKER.md`).

- **Why:** The current classifier has known weaknesses on E, S, T, M, N, P, Q.
  A trained model will be dramatically more accurate for real-world use.
- **How:** Follow `docs/training/train_asl_gesture_model.ipynb` to produce
  `asl-fingerspelling-v1.task`, then swap it in via `useSignDetector.ts`.
- **Acceptance:** Per-class accuracy meets the floors in `docs/PRD.md` (F-2 / ML-3):
  reliable set >=95%, weak set >=85%, none below 80%.

---

### 2. Speech-to-Text for the Hearing Side (Two-Way Bridge)
Use the browser's built-in **Web Speech API** to let the hearing person speak,
with their words appearing as text for the deaf user to read.

- **Why:** The conversation is currently one-way. A pharmacist or doctor can't
  communicate back through the app. This makes SignBridge a true two-way bridge.
- **How:** Use `window.SpeechRecognition` (no backend, no API key needed — it's
  built into Chrome, Edge, and Safari). Show speech transcript in a second panel
  on the Workspace screen.
- **Privacy note:** Web Speech API sends audio to the browser vendor's servers by
  default. Surface this clearly in the UI to stay consistent with the app's
  privacy-first brand. Consider adding a toggle to disable it.

---

### 3. Word Auto-Complete / Prediction
After detecting "H-E-L", predict **"HELLO"** and show 2–3 word suggestions the
user can tap to confirm — skipping the remaining letters entirely.

- **Why:** Fingerspelling every letter of every word is slow. Word prediction makes
  it 3–4x faster, which is the difference between "usable" and "preferred" in
  a real counter interaction.
- **How:** Build a prefix-matching dictionary lookup (a simple JSON word list is
  enough to start). Show the top 3 matches as tappable chips above the transcript.
- **Enhancement:** Weight suggestions by the saved Phrasebook entries first, so
  personal or frequent words surface at the top.

---

## 🟡 High Impact — Do These Next

### 4. Counter Mode (Full-Screen Transcript)
A dedicated display mode that shows ONLY the translated transcript in very large
text (48px+), high contrast, full screen — optimized for the hearing person
standing across a counter to read at arm's length.

- **How:** Add a "Show to Staff" button on the Workspace page that pushes the
  transcript into a full-screen overlay. Tap anywhere to return to camera view.
- **Why:** The `PRODUCT.md` states "The transcript is the product." Counter Mode
  makes that literal. It requires no code changes to the ML pipeline.

---

### 5. Quick Phrase Shortcuts Bar
A horizontal scrollable bar of one-tap phrases above the transcript.

- **Why:** At a pharmacy, 80% of interactions use the same 20 phrases:
  *"I need to pick up a prescription"*, *"My name is spelled…"*,
  *"Can you call someone who knows sign language?"*
- **How:** Pre-load a default set of common counter phrases. Let the user
  customize it from their saved Phrasebook entries. One tap = phrase appears
  instantly in the transcript (no fingerspelling required).

---

### 6. Undo Last Word
A single-tap button to delete the last recognized word from the live transcript.

- **Why:** If the model misreads "WORLD" as "WROLD", the user currently has to
  clear the entire transcript and start over. An undo button lets them fix a
  single mistake without losing the rest of the conversation.
- **How:** Keep a word-level history stack in the Workspace component and pop
  the last entry on button press.

---

### 7. PWA — Installable App
Package SignBridge as a **Progressive Web App** so users can add it to their
phone's home screen.

- **Why:** Removes the friction of opening a browser and typing a URL at the
  exact moment someone need it in public. Feels like a native app.
- **How:** Add a `manifest.json` and a Service Worker that pre-caches the WASM
  and model files. Aligns with PRD **F-36** in the M6 roadmap.
- **Bonus:** Once cached, it works fully offline with zero network requests
  during use — perfectly consistent with the "no egress" privacy promise.

---

## 🟢 Medium Impact — Polish Round

### 8. J and Z Motion Letter Support
J and Z are drawn in the air as motion gestures. A single camera frame cannot
distinguish them from other letters.

- **Why:** These are real ASL letters that users will attempt to sign.
  The app currently drops them silently, which is confusing.
- **How:** Maintain a ring buffer of the last 10–15 frames of hand landmarks.
  Detect the characteristic J-hook and Z-zigzag motion patterns over time.
  Tracked in `MIGRATION_TRACKER.md` as **PRD F-7 / ML-4**.

---

### 9. Hand Landmark Confidence Heatmap Overlay
A subtle, optional overlay on the camera feed that highlights which hand joints
are being tracked with high vs. low confidence.

- **Why:** Users don't know why the AI is confused. A visual heatmap lets them
  self-correct their hand position — e.g., realize their pinky is out of frame —
  without any guesswork.
- **How:** Use the `landmarks` data already returned by `useSignDetector` to
  draw colored dots (green = high confidence, amber = low) over the video feed
  using a `<canvas>` overlay.
- **Accessibility note:** Must be off by default, toggleable in Settings,
  and must respect high-contrast mode.

---

## 💡 Longer-Term Ideas (Future Milestones)

| Idea | Notes |
|---|---|
| **Common ASL sign vocabulary** (not just fingerspelling) | Requires a different, more complex model trained on full signs — the biggest single upgrade possible. |
| **ISL / BSL support** | Flip `available: true` in `constants/languages.ts` once models exist (PRD F-8). |
| **Fingerspelling avatar** (Text→Sign) | A 3D avatar that signs back to the deaf user — un-gate when real data is ready (PRD F-10). |
| **Session summary export** | After a counter visit, export the full conversation as a `.txt` or share via SMS/WhatsApp. |
| **Low-light mode** | Pre-process camera frames to boost brightness before sending to the hand detector — improves accuracy in dim environments like clinics. |
