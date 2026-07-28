import { useState } from 'react';
import { Avatar3D } from '../components/Avatar3D';

/**
 * Dev-only harness (route /dev/pose-spike) for exercising the real Avatar3D
 * component — framing, idle rest pose, and fingerspelling playback — without
 * the Workspace's MediaPipe webcam pipeline, which saturates the main thread
 * and makes the avatar hard to inspect. Not shipped in production builds.
 */
export function PoseSpike() {
  const [text, setText] = useState('');
  const [playRequest, setPlayRequest] = useState<{ text: string; id: number } | null>(null);

  const sign = () => {
    const clean = text.trim();
    if (clean) setPlayRequest({ text: clean, id: Date.now() });
  };

  return (
    <div className="flex h-screen w-full flex-col bg-neutral-800">
      <div className="flex gap-2 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sign()}
          placeholder="Type a word or letter to sign…"
          className="flex-1 rounded-lg border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm text-white"
        />
        <button onClick={sign} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white">
          Sign
        </button>
      </div>
      <div className="flex-1">
        <Avatar3D playRequest={playRequest} className="h-full w-full" />
      </div>
    </div>
  );
}
