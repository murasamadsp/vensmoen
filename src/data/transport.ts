// Застосунки з розкладом транспорту. Рейсів до Рокланда мало,
// у свята ще менше – тому посилання на розклад завжди під рукою.
// Брендові назви не перекладаються (як mapLinks у location.ts).
export interface TransportApp {
  /** Назва бренду – не перекладається */
  name: string;
  href: string;
}

export const transportApps: TransportApp[] = [
  { name: 'Entur', href: 'https://entur.no' },
  { name: 'Vy', href: 'https://www.vy.no' },
  { name: 'Reis Nordland', href: 'https://www.reisnordland.no' },
];
