// Transcript export: pure text builder + a browser download side-effect.

interface TranscriptEntry {
  time: string;
  text: string;
  direction?: string;
}

/**
 * Build a readable plain-text transcript. Pure. `meta` entries are skipped.
 * Falls back to a "(no translations)" body line when nothing remains.
 */
export function buildTranscriptText(
  entries: TranscriptEntry[],
  title = 'SignBridge session transcript',
): string {
  const body = entries
    .filter((e) => e.direction !== 'meta')
    .map((e) => `[${e.time}] ${e.text}`);

  return [title, '', ...(body.length ? body : ['(no translations)'])].join('\n');
}

/** Trigger a browser download of `text` as a .txt file. */
export function downloadTranscript(text: string, filename = 'signbridge-transcript.txt'): void {
  if (typeof document === 'undefined') return;

  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
