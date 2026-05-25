/**
 * Generic Content Module Data Structure
 * 
 * This is a TEMPLATE for module data files.
 * Copy this structure to create new modules:
 * - src/data/modules/health.ts
 * - src/data/modules/legal.ts
 * - etc.
 * 
 * AGENT-FRIENDLY: Just fill in the articles array with your content
 */

export interface Article {
  /** Unique slug for the article (used in URLs) */
  slug: string;
  /** Reference to i18n key for title (e.g., 'health.articles.emergency.title') */
  titleKey: string;
  /** Short summary/excerpt */
  excerpt?: string;
  /** Optional: category/tag for filtering */
  category?: string;
  /** Optional: priority/urgency level */
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  /** Optional: related article slugs */
  related?: string[];
}

export interface ModuleData {
  /** Module ID matching the config */
  moduleId: string;
  /** List of articles/topics in this module */
  articles: Article[];
  /** Optional: FAQ items */
  faqs?: Array<{ question: string; answer: string }>;
  /** Optional: external resources/links */
  resources?: Array<{ label: string; url: string }>;
}

// Template - replace with actual module data
export const moduleData: ModuleData = {
  moduleId: 'template',
  articles: [
    // Example article structure:
    // {
    //   slug: 'emergency-numbers',
    //   titleKey: 'template.articles.emergencyNumbers.title',
    //   excerpt: 'Important emergency contact numbers',
    //   priority: 'urgent',
    // },
  ],
  faqs: [],
  resources: [],
};
