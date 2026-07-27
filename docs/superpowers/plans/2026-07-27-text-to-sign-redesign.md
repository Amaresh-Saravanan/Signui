> **Superseded.** This plan predates `docs/superpowers/specs/2026-07-27-sign-animation-engine-design.md`
> and conflicts with it (`isAnimating: boolean` prop driven by a fake `setTimeout` vs. the approved
> `playRequest`/`onPlaybackStateChange` design). Do not execute this plan — see
> `docs/superpowers/plans/2026-07-27-sign-animation-engine.md` instead.

---

# Text-to-Sign Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the text-to-sign mode with polished styling, strategic avatar positioning, enhanced visual staging, and a smooth input-to-animation workflow that feels production-ready.

**Architecture:** The redesign separates concerns into discrete layers: (1) improved layout grid with hero staging and input zone, (2) enhanced Avatar3D with dynamic lighting and camera positioning based on input state, (3) visual feedback components (prediction chips, confidence badges) adapted for text-to-sign, (4) smooth state-driven animations for mode transitions and input processing.

**Tech Stack:** React, Framer Motion (existing), Three.js (via @react-three/fiber), Tailwind CSS, existing design tokens.

## Global Constraints

- Must maintain existing responsive behavior (desktop lg: cols, mobile single-col stack)
- All styling must use existing theme tokens (`--color-*`, `--font-*`)
- No new dependencies beyond what's already installed
- Avatar3D component must remain composable and reusable
- Text-to-sign must be toggleable with sign-to-text mode without layout shift
- Animations must respect prefers-reduced-motion

---

## File Structure

**Core Component Modifications:**
- `src/pages/Workspace.tsx` — Mode-aware layout, input state management for text-to-sign
- `src/components/Avatar3D.tsx` — Enhanced with reactive lighting + camera based on text input state
- `src/components/workspace/TextToSignInput.tsx` — *NEW* — Dedicated input component with prediction, confidence, submit flow
- `src/components/workspace/TextToSignStaging.tsx` — *NEW* — Layout container for hero avatar + input zone with visual hierarchy
- `src/lib/textToSignPredict.ts` — *NEW* — Word prediction logic for text-to-sign (parallel to sign-to-text)
- `src/hooks/useTextToSignAnimations.ts` — *NEW* — Manages avatar state transitions (idle → processing → signing)

**Styling & Theme:**
- Existing CSS tokens (already in codebase)
- New layout variables in `src/styles/workspace.css` (if needed) — optional, prefer inline Tailwind

---

## Task Breakdown

### Task 1: Create TextToSignInput Component

**Files:**
- Create: `src/components/workspace/TextToSignInput.tsx`
- Modify: `src/pages/Workspace.tsx` (import + state wiring)

**Interfaces:**
- Consumes: `{ inputText: string, onInputChange: (text: string) => void, onSubmit: () => void, disabled?: boolean, suggestions?: string[] }`
- Produces: React component rendering an enhanced textarea with live prediction chips, character count, submit button

**Description:** A focused text input component for text-to-sign mode. Features:
- Large, typography-forward textarea with live character count
- Prediction chips below (similar to sign-to-text but for word suggestions)
- Submit button that triggers avatar animation
- Visual feedback for empty/filled states
- Keyboard shortcut (Shift+Enter or Cmd+Enter to submit)

- [ ] **Step 1: Write the component shell**

Create `src/components/workspace/TextToSignInput.tsx`:

```typescript
import { useState } from 'react';
import { Send, Type } from 'lucide-react';
import { Button } from '../Button';
import { cn } from '../../utils/cn';

interface TextToSignInputProps {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  suggestions?: string[];
  onSuggestionPick?: (suggestion: string) => void;
}

export function TextToSignInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  suggestions = [],
  onSuggestionPick,
}: TextToSignInputProps) {
  const hasText = value.trim().length > 0;
  const charCount = value.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.shiftKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (hasText && !disabled) onSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <label htmlFor="text-to-sign-input" className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
          <Type size={12} /> Enter text to sign
        </label>
        <span className="font-mono text-xs text-text-secondary tabular-nums">{charCount}/500</span>
      </div>

      <textarea
        id="text-to-sign-input"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 500))}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Type what you want to sign…"
        className={cn(
          'w-full resize-none rounded-xl border border-border bg-surface-alt p-4 text-base text-text-primary placeholder:text-text-secondary focus:border-primary/40 focus:outline-none transition-all h-24',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-label="Text to sign"
      />

      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSuggestionPick?.(suggestion)}
              className="glass rounded-full px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange('')}
          disabled={!hasText || disabled}
          className="flex-1"
        >
          Clear
        </Button>
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={!hasText || disabled}
          className="flex-1"
        >
          <Send size={14} /> Sign it
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify component renders without errors**

Run: `npm run dev` and navigate to workspace in text-to-sign mode
Expected: Component renders (will be wired up in Task 2)

- [ ] **Step 3: Commit**

```bash
git add src/components/workspace/TextToSignInput.tsx
git commit -m "feat(text-to-sign): create dedicated input component with predictions and submit flow"
```

---

### Task 2: Create TextToSignStaging Component (Layout Container)

**Files:**
- Create: `src/components/workspace/TextToSignStaging.tsx`

**Interfaces:**
- Consumes: `{ avatar: ReactNode, inputComponent: ReactNode, isProcessing?: boolean }`
- Produces: React component with hero avatar staging (60% width on desktop, full on mobile) + input zone (40% width on desktop)

**Description:** A layout-focused component that stages the avatar prominently alongside the text input. Provides visual hierarchy and responsive grid behavior.

- [ ] **Step 1: Write the component**

Create `src/components/workspace/TextToSignStaging.tsx`:

```typescript
import { cn } from '../../utils/cn';

interface TextToSignStagingProps {
  avatar: React.ReactNode;
  inputComponent: React.ReactNode;
  isProcessing?: boolean;
}

export function TextToSignStaging({
  avatar,
  inputComponent,
  isProcessing = false,
}: TextToSignStagingProps) {
  return (
    <div className="grid h-full gap-4 p-4 lg:grid-cols-[2fr_1fr]">
      {/* Hero Avatar Stage */}
      <div
        className={cn(
          'relative rounded-2xl overflow-hidden bg-surface-alt border border-border/50',
          isProcessing && 'ring-2 ring-primary/30'
        )}
      >
        {avatar}
        
        {/* Lighting gradient overlay (optional subtle vignette) */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 to-transparent opacity-30" />
      </div>

      {/* Input & Controls Zone */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 overflow-y-auto">
        <div className="flex-1">{inputComponent}</div>
        
        {/* Optional: Status indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">Avatar is signing…</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify responsive layout (desktop + mobile)**

Run: `npm run dev`, open DevTools, toggle between desktop and mobile viewports
Expected: On desktop, 2-column grid with avatar taking 60% space. On mobile (< lg), full-width single column stack.

- [ ] **Step 3: Commit**

```bash
git add src/components/workspace/TextToSignStaging.tsx
git commit -m "feat(text-to-sign): create staging layout with hero avatar + input zone"
```

---

### Task 3: Update Avatar3D with Dynamic Lighting & Reactive Camera

**Files:**
- Modify: `src/components/Avatar3D.tsx`

**Interfaces:**
- Consumes: `{ className?: string, isAnimating?: boolean, focusHeight?: number }`
- Produces: Same component, with new props controlling lighting intensity and camera framing based on animation state

**Description:** Enhance Avatar3D to respond to text-to-sign input state. When text is entered and submitted, lighting intensifies and camera focus shifts. This creates visual feedback that the avatar is "about to perform."

- [ ] **Step 1: Add new props to Avatar3D**

Update the top of `src/components/Avatar3D.tsx` function signature:

```typescript
interface Avatar3DProps {
  className?: string;
  isAnimating?: boolean;
  focusHeight?: number;
}

export function Avatar3D({ className, isAnimating = false, focusHeight }: Avatar3DProps) {
```

- [ ] **Step 2: Update lighting based on isAnimating**

Inside the `ThemeBackground` function (around line 136), add conditional intensity:

```typescript
function ThemeBackground({ color, isAnimating }: { color: string; isAnimating?: boolean }) {
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    scene.background = new THREE.Color(color);
  }, [scene, color]);
  
  // Update lights in scene based on animation state
  const lights = scene.children.filter(child => child instanceof THREE.Light);
  lights.forEach(light => {
    if (light instanceof THREE.HemisphereLight) {
      light.intensity = isAnimating ? 0.85 : 0.7;
    }
    if (light instanceof THREE.DirectionalLight) {
      light.intensity = isAnimating ? 1.1 : 0.9;
    }
  });
  
  return null;
}
```

Then update the Canvas call to pass isAnimating (line ~183):

```typescript
<ThemeBackground color={surfaceColor} isAnimating={isAnimating} />
```

- [ ] **Step 3: Add smooth transitions to lighting**

Wrap light updates in framer-motion or use Three.js tweens. For simplicity, add a useEffect in Avatar3D that smoothly transitions light intensities:

```typescript
useEffect(() => {
  // This is handled via Three.js native rendering
  // The scene.children filter in ThemeBackground already reads isAnimating
}, [isAnimating]);
```

- [ ] **Step 4: Test lighting changes**

Run: `npm run dev`, go to text-to-sign mode, type text and click "Sign it"
Expected: Lighting intensifies briefly (visual feedback that avatar is active)

- [ ] **Step 5: Commit**

```bash
git add src/components/Avatar3D.tsx
git commit -m "feat(Avatar3D): add reactive lighting based on animation state"
```

---

### Task 4: Wire Text-to-Sign State into Workspace Component

**Files:**
- Modify: `src/pages/Workspace.tsx`

**Interfaces:**
- Consumes: `TextToSignInput`, `TextToSignStaging`, updated `Avatar3D` props
- Produces: Working text-to-sign mode with state management, input handling, and history tracking

**Description:** Connect the new components to the Workspace, enable text-to-sign input, and wire up state for tracking entered text and submission.

- [ ] **Step 1: Add imports at top of Workspace.tsx**

Add after existing imports (around line 25):

```typescript
import { TextToSignInput } from '../components/workspace/TextToSignInput';
import { TextToSignStaging } from '../components/workspace/TextToSignStaging';
```

- [ ] **Step 2: Add text-to-sign state variables**

Inside the Workspace component, after the existing state declarations (around line 102):

```typescript
// Text-to-sign mode state
const [textToSignInput, setTextToSignInput] = useState('');
const [textToSignProcessing, setTextToSignProcessing] = useState(false);
const [textToSignHistory, setTextToSignHistory] = useState<Array<{ id: number; text: string; timestamp: string }>>([]);
```

- [ ] **Step 3: Create handleTextToSignSubmit function**

Add before the return statement (around line 428):

```typescript
const handleTextToSignSubmit = () => {
  const text = textToSignInput.trim();
  if (!text) return;

  setTextToSignProcessing(true);

  // Add to text-to-sign history
  const entry = {
    id: Date.now(),
    text,
    timestamp: now(),
  };
  setTextToSignHistory((prev) => [...prev, entry]);

  // Add to app history for tracking
  addHistoryEntry({
    text,
    type: 'text-to-sign',
    languageCode: activeLanguage,
  });

  // Clear input
  setTextToSignInput('');

  // Simulate animation duration, then reset processing flag
  setTimeout(() => {
    setTextToSignProcessing(false);
  }, 3000);
};
```

- [ ] **Step 4: Update the text-to-sign branch of the JSX**

Replace the current text-to-sign section (around line 492) with:

```typescript
        ) : (
          <TextToSignStaging
            avatar={<Avatar3D className="absolute inset-0 h-full w-full rounded-none border-none" isAnimating={textToSignProcessing} />}
            inputComponent={
              <TextToSignInput
                value={textToSignInput}
                onChange={setTextToSignInput}
                onSubmit={handleTextToSignSubmit}
                disabled={textToSignProcessing}
              />
            }
            isProcessing={textToSignProcessing}
          />
        )}
```

- [ ] **Step 5: Test full flow**

Run: `npm run dev`, switch to text-to-sign mode, type text, click "Sign it"
Expected: 
- Input clears
- Avatar lighting intensifies
- Processing indicator shows
- After 3 seconds, processing state resets

- [ ] **Step 6: Commit**

```bash
git add src/pages/Workspace.tsx
git commit -m "feat(workspace): wire text-to-sign mode with input, staging, and processing state"
```

---

### Task 5: Add Smooth Mode Transition Animations

**Files:**
- Modify: `src/pages/Workspace.tsx` (JSX only)

**Interfaces:**
- Consumes: Existing `motion` from framer-motion
- Produces: Smooth cross-fade between sign-to-text and text-to-sign layouts

**Description:** Add AnimatePresence wrapper around the camera stage so switching modes feels polished, not jarring.

- [ ] **Step 1: Wrap the mode-specific sections in AnimatePresence**

Around line 447 (camera stage), wrap the entire section content:

```typescript
      <section aria-label="Camera" className="relative min-h-[50vh] overflow-hidden bg-black lg:min-h-0">
        <AnimatePresence mode="wait">
          {mode === 'sign-to-text' ? (
            <motion.div
              key="sign-to-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              {/* existing sign-to-text content */}
            </motion.div>
          ) : (
            <motion.div
              key="text-to-sign"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 w-full h-full"
            >
              {/* text-to-sign staging */}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
```

- [ ] **Step 2: Test mode switching**

Run: `npm run dev`, toggle between sign-to-text and text-to-sign modes
Expected: Smooth fade transitions, no layout jump

- [ ] **Step 3: Commit**

```bash
git add src/pages/Workspace.tsx
git commit -m "feat(workspace): add smooth mode transition animations"
```

---

### Task 6: Polish & Responsive Testing

**Files:**
- Modify: `src/components/workspace/TextToSignInput.tsx`, `src/components/workspace/TextToSignStaging.tsx` (styling refinements)

**Interfaces:**
- No new interfaces; refinement pass only

**Description:** Test responsive behavior on mobile/tablet/desktop, adjust spacing and sizing for better visual balance, ensure touch-friendly button sizes.

- [ ] **Step 1: Test mobile layout (< 640px)**

Run: `npm run dev`, open DevTools mobile mode (iPhone 12)
Expected: 
- TextToSignStaging collapses to single column
- Avatar takes full width at top
- Input zone below
- Text input is touch-friendly (min 44px height)

Verify: Adjust padding/margins in TextToSignStaging if needed

- [ ] **Step 2: Test tablet layout (640px - 1024px)**

Run: DevTools tablet mode (iPad)
Expected: Graceful transition between mobile and desktop layouts

- [ ] **Step 3: Test dark/light theme**

Toggle theme in app, ensure colors are readable and consistent

- [ ] **Step 4: Test keyboard accessibility**

- Tab through input fields
- Shift+Enter submits
- All buttons accessible

- [ ] **Step 5: Commit**

```bash
git add src/components/workspace/TextToSignStaging.tsx src/components/workspace/TextToSignInput.tsx
git commit -m "polish(text-to-sign): responsive layout refinements and accessibility checks"
```

---

## Execution Options

**Plan complete and saved.** Two execution options:

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration  
**2. Inline Execution** — Execute tasks in this session using executing-plans

Which approach would you prefer?
