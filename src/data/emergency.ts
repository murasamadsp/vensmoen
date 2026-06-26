// Національні екстрені номери – постійні факти, однакові по всій Норвегії.
// Підписи перекладаються в i18n (site.emergency*), номери універсальні.
import settings from './site-settings.json';

export interface EmergencyNumber {
  id: 'fire' | 'police' | 'ambulance' | 'doctor';
  /** Значення для tel:-посилання */
  tel: string;
  /** Як номер показується на сторінці (з пробілами) */
  display: string;
}

export const emergencyNumbers: EmergencyNumber[] = [
  { id: 'fire', tel: '110', display: '110' },
  { id: 'police', tel: '112', display: '112' },
  { id: 'ambulance', tel: '113', display: '113' },
  { id: 'doctor', tel: '116117', display: '116 117' },
];

// Черговий телефон центру: редагується в CMS у src/data/site-settings.json.
export const dutyPhone = settings.dutyPhone;

// Психологічна підтримка Mental Helse: номер редагується в CMS.
export const mentalHealth = settings.mentalHealth;
