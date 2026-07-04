export interface SupportedSignLanguage {
  code: 'ISL' | 'ASL' | 'BSL';
  label: string;
  region: 'India' | 'US' | 'UK';
  direction: string;
  engineVersion: string;
}

export const SUPPORTED_SIGN_LANGUAGES: SupportedSignLanguage[] = [
  {
    code: 'ISL',
    label: 'Indian Sign Language (ISL)',
    region: 'India',
    direction: 'ISL <-> English',
    engineVersion: 'v2.1',
  },
  {
    code: 'ASL',
    label: 'American Sign Language (ASL)',
    region: 'US',
    direction: 'ASL <-> English',
    engineVersion: 'v2.4',
  },
  {
    code: 'BSL',
    label: 'British Sign Language (BSL)',
    region: 'UK',
    direction: 'BSL <-> English',
    engineVersion: 'v2.2',
  },
];