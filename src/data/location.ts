// Посилання на карти – відкривають застосунок карт на телефоні (без iframe:
// сама сторінка не робить зовнішніх запитів, CSP залишається 'self').
import settings from './site-settings.json';

export interface MapLink {
  /** Назва бренду – не перекладається */
  name: string;
  href: string;
}

export const mapLinks: MapLink[] = settings.mapLinks;
