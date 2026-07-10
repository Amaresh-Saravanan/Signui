export interface SupportedSignLanguage {
  code: 'ISL' | 'ASL' | 'BSL';
  label: string;
  region: 'India' | 'US' | 'UK';
  direction: string;
  /**
   * Whether a real detection model ships for this language today.
   * Only ASL has a working classifier (src/lib/aslClassifier.ts); ISL and BSL
   * are surfaced as "coming soon" and must not record translations (ML-5).
   */
  available: boolean;
}

export const SUPPORTED_SIGN_LANGUAGES: SupportedSignLanguage[] = [
  {
    code: 'ASL',
    label: 'American Sign Language (ASL)',
    region: 'US',
    direction: 'ASL <-> English',
    available: true,
  },
  {
    code: 'ISL',
    label: 'Indian Sign Language (ISL)',
    region: 'India',
    direction: 'ISL <-> English',
    available: false,
  },
  {
    code: 'BSL',
    label: 'British Sign Language (BSL)',
    region: 'UK',
    direction: 'BSL <-> English',
    available: false,
  },
];

/** The one language that currently has a shipped detection model. */
export const DEFAULT_AVAILABLE_LANGUAGE: SupportedSignLanguage['code'] = 'ASL';

export function isLanguageAvailable(code: string): boolean {
  return SUPPORTED_SIGN_LANGUAGES.some((l) => l.code === code && l.available);
}
