import { describe, it, expect } from 'vitest';
import { buildTranscriptText } from './sessionExport';

describe('buildTranscriptText', () => {
  it('includes the title header and formats entries as "[time] text"', () => {
    const out = buildTranscriptText([
      { time: '00:01', text: 'hello' },
      { time: '00:05', text: 'world' },
    ]);
    expect(out).toBe(
      'SignBridge session transcript\n\n[00:01] hello\n[00:05] world',
    );
  });

  it('uses a custom title when provided', () => {
    const out = buildTranscriptText([{ time: '00:01', text: 'hi' }], 'My Session');
    expect(out.startsWith('My Session\n\n')).toBe(true);
  });

  it('skips meta entries', () => {
    const out = buildTranscriptText([
      { time: '00:00', text: 'session started', direction: 'meta' },
      { time: '00:01', text: 'A', direction: 'out' },
    ]);
    expect(out).not.toContain('session started');
    expect(out).toContain('[00:01] A');
  });

  it('returns header + "(no translations)" for empty input', () => {
    expect(buildTranscriptText([])).toBe(
      'SignBridge session transcript\n\n(no translations)',
    );
  });

  it('returns header + "(no translations)" when all entries are meta', () => {
    const out = buildTranscriptText([
      { time: '00:00', text: 'started', direction: 'meta' },
    ]);
    expect(out).toBe('SignBridge session transcript\n\n(no translations)');
  });
});
