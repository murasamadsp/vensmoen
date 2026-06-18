// Nasjonale nødnumre – permanente fakta, like i hele Norge.
// Etiketter oversettes i i18n (site.emergency*), numrene er universelle.
export interface EmergencyNumber {
  id: 'fire' | 'police' | 'ambulance' | 'doctor';
  /** Verdi til tel:-lenken */
  tel: string;
  /** Slik nummeret vises (med mellomrom) */
  display: string;
}

export const emergencyNumbers: EmergencyNumber[] = [
  { id: 'fire', tel: '110', display: '110' },
  { id: 'police', tel: '112', display: '112' },
  { id: 'ambulance', tel: '113', display: '113' },
  { id: 'doctor', tel: '116117', display: '116 117' },
];

// Черговий телефон центру: працює 24/7, навіть коли офіс зачинений.
// Підписи (site.dutyTitle/dutyText) перекладаються в i18n, номер універсальний.
export const dutyPhone = {
  tel: '+4748201948',
  display: '+47 482 01 948',
} as const;

// Психологічна підтримка: Mental Helse hjelpetelefon — національна,
// цілодобова, безкоштовна й анонімна. Окремо від медичного legevakt (116117).
// Підписи (site.mentalTitle/mentalText) перекладаються в i18n.
export const mentalHealth = {
  tel: '116123',
  display: '116 123',
} as const;
