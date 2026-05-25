/**
 * Module Registry - Central configuration for all WikiHub modules
 * 
 * This file defines the modular structure of the Refugee WikiHub.
 * Each module represents a content section (Health, Legal, Education, etc.)
 * 
 * To add a new module:
 * 1. Add entry to MODULES array below
 * 2. Create corresponding translations in src/i18n/<locale>.json
 * 3. Create optional module-specific data in src/data/modules/<moduleId>.ts
 * 
 * AGENT-FRIENDLY: Simple array structure, easy to extend
 */

export interface ModuleConfig {
  /** Unique identifier for the module (used in URLs and i18n keys) */
  id: string;
  /** Icon/name for visual identification */
  icon: string;
  /** Color theme for the module (hex or oklch) */
  color: string;
  /** Whether this module is enabled/visible */
  enabled: boolean;
  /** Optional: path to module-specific data file */
  dataFile?: string;
}

export const MODULES: ModuleConfig[] = [
  {
    id: 'fractions',
    icon: '♻️',
    color: '#2f7d3b',
    enabled: true,
    dataFile: 'fractions.ts',
  },
  {
    id: 'health',
    icon: '🏥',
    color: '#e05a5a',
    enabled: true,
  },
  {
    id: 'legal',
    icon: '⚖️',
    color: '#5a7de0',
    enabled: true,
  },
  {
    id: 'education',
    icon: '📚',
    color: '#e0a55a',
    enabled: true,
  },
  {
    id: 'camp',
    icon: '🏕️',
    color: '#5ae0a5',
    enabled: true,
  },
];

export const ENABLED_MODULES = MODULES.filter((m) => m.enabled);

/**
 * Get module config by ID
 */
export function getModule(id: string): ModuleConfig | undefined {
  return MODULES.find((m) => m.id === id);
}

/**
 * Check if a module is enabled
 */
export function isModuleEnabled(id: string): boolean {
  const mod = getModule(id);
  return mod !== undefined && mod.enabled;
}
