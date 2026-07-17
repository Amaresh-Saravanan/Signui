import { describe, it, expect } from 'vitest';
import { predict } from './wordPredict';

describe('predict', () => {
  it('matches a prefix from the common dictionary', () => {
    // "prescription" is a known pharmacy word in COMMON_WORDS.
    const out = predict('presc');
    expect(out).toContain('PRESCRIPTION');
  });

  it('ranks phrasebook matches before dictionary matches', () => {
    const phrasebook = { names: ['Pralatrexate'] }; // fake word, dictionary won't have it
    const out = predict('pr', phrasebook, 3);
    expect(out[0]).toBe('PRALATREXATE');
  });

  it('respects the limit', () => {
    const phrasebook = { a: ['pray', 'press', 'pretty', 'price', 'proud'] };
    expect(predict('pr', phrasebook, 2)).toHaveLength(2);
  });

  it('defaults the limit to 3', () => {
    const phrasebook = { a: ['pray', 'press', 'pretty', 'price', 'proud'] };
    expect(predict('pr', phrasebook)).toHaveLength(3);
  });

  it('returns [] for an empty or whitespace prefix', () => {
    expect(predict('')).toEqual([]);
    expect(predict('   ')).toEqual([]);
  });

  it('is case-insensitive on the prefix and uppercases results', () => {
    const phrasebook = { a: ['Prescription'] };
    expect(predict('PRE', phrasebook, 1)).toEqual(['PRESCRIPTION']);
  });

  it('excludes exact-length matches (only strictly longer)', () => {
    const phrasebook = { a: ['pay', 'payment'] };
    const out = predict('pay', phrasebook, 5);
    expect(out).toContain('PAYMENT');
    expect(out).not.toContain('PAY');
  });

  it('dedupes case-insensitively across sources', () => {
    // Phrasebook and dictionary both surface "pharmacy" — only once.
    const phrasebook = { a: ['Pharmacy'] };
    const out = predict('pharm', phrasebook, 5);
    expect(out.filter((w) => w === 'PHARMACY')).toHaveLength(1);
  });
});
