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
