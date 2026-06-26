// Застосунки з розкладом транспорту. Рейсів до Рокланда мало,
// у свята ще менше – тому посилання на розклад завжди під рукою.
// Брендові назви не перекладаються (як mapLinks у location.ts).
import settings from './site-settings.json';

export interface TransportApp {
  /** Назва бренду – не перекладається */
  name: string;
  href: string;
}

export const transportApps: TransportApp[] = settings.transportApps;
