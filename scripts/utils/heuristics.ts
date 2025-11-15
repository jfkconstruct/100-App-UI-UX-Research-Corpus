import { readJSON, getAbsolutePath } from './fs-helpers';

export interface HeuristicScores {
  clarity: number;
  cognitive_load: number;
  visual_hierarchy: number;
  feedback: number;
  accessibility: number;
  conversion_strength: number;
}

export interface Heuristic {
  id: string;
  name: string;
  weight: number;
  description?: string;
}

export interface HeuristicsConfig {
  heuristics: Heuristic[];
}

const HEURISTICS_CONFIG_PATH = 'config/heuristics.json';

/**
 * Load heuristics configuration
 */
export function loadHeuristicsConfig(): HeuristicsConfig {
  const configPath = getAbsolutePath(HEURISTICS_CONFIG_PATH);
  return readJSON<HeuristicsConfig>(configPath);
}

/**
 * Get heuristic by ID
 */
export function getHeuristic(id: string): Heuristic | undefined {
  const config = loadHeuristicsConfig();
  return config.heuristics.find((h) => h.id === id);
}

/**
 * Get all heuristic IDs
 */
export function getHeuristicIds(): string[] {
  const config = loadHeuristicsConfig();
  return config.heuristics.map((h) => h.id);
}

/**
 * Calculate average of heuristic scores
 */
export function averageHeuristics(scores: HeuristicScores[]): HeuristicScores {
  if (scores.length === 0) {
    return {
      clarity: 0,
      cognitive_load: 0,
      visual_hierarchy: 0,
      feedback: 0,
      accessibility: 0,
      conversion_strength: 0,
    };
  }

  const totals: HeuristicScores = {
    clarity: 0,
    cognitive_load: 0,
    visual_hierarchy: 0,
    feedback: 0,
    accessibility: 0,
    conversion_strength: 0,
  };

  for (const score of scores) {
    totals.clarity += score.clarity;
    totals.cognitive_load += score.cognitive_load;
    totals.visual_hierarchy += score.visual_hierarchy;
    totals.feedback += score.feedback;
    totals.accessibility += score.accessibility;
    totals.conversion_strength += score.conversion_strength;
  }

  const count = scores.length;

  return {
    clarity: Math.round((totals.clarity / count) * 10) / 10,
    cognitive_load: Math.round((totals.cognitive_load / count) * 10) / 10,
    visual_hierarchy: Math.round((totals.visual_hierarchy / count) * 10) / 10,
    feedback: Math.round((totals.feedback / count) * 10) / 10,
    accessibility: Math.round((totals.accessibility / count) * 10) / 10,
    conversion_strength: Math.round((totals.conversion_strength / count) * 10) / 10,
  };
}

/**
 * Calculate weighted overall score for a set of heuristics
 */
export function calculateWeightedScore(scores: HeuristicScores): number {
  const config = loadHeuristicsConfig();

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const heuristic of config.heuristics) {
    const score = scores[heuristic.id as keyof HeuristicScores];
    if (typeof score === 'number') {
      totalWeightedScore += score * heuristic.weight;
      totalWeight += heuristic.weight;
    }
  }

  if (totalWeight === 0) return 0;

  return Math.round((totalWeightedScore / totalWeight) * 10) / 10;
}

/**
 * Validate that heuristic scores are in valid range (0-5)
 */
export function validateHeuristicScores(scores: HeuristicScores): string[] {
  const errors: string[] = [];
  const heuristicIds = getHeuristicIds();

  for (const id of heuristicIds) {
    const score = scores[id as keyof HeuristicScores];

    if (typeof score !== 'number') {
      errors.push(`Missing score for heuristic: ${id}`);
      continue;
    }

    if (score < 0 || score > 5) {
      errors.push(`Invalid score for ${id}: ${score} (must be 0-5)`);
    }
  }

  return errors;
}

/**
 * Get heuristic score as a letter grade
 */
export function getLetterGrade(score: number): string {
  if (score >= 4.5) return 'A';
  if (score >= 4.0) return 'A-';
  if (score >= 3.5) return 'B+';
  if (score >= 3.0) return 'B';
  if (score >= 2.5) return 'B-';
  if (score >= 2.0) return 'C+';
  if (score >= 1.5) return 'C';
  if (score >= 1.0) return 'C-';
  if (score >= 0.5) return 'D';
  return 'F';
}

/**
 * Compare two heuristic scores and return the differences
 */
export function compareHeuristics(
  scores1: HeuristicScores,
  scores2: HeuristicScores
): Record<string, number> {
  const differences: Record<string, number> = {};
  const heuristicIds = getHeuristicIds();

  for (const id of heuristicIds) {
    const score1 = scores1[id as keyof HeuristicScores];
    const score2 = scores2[id as keyof HeuristicScores];

    if (typeof score1 === 'number' && typeof score2 === 'number') {
      differences[id] = Math.round((score2 - score1) * 10) / 10;
    }
  }

  return differences;
}

/**
 * Get the top N heuristics by score
 */
export function getTopHeuristics(
  scores: HeuristicScores,
  n: number = 3
): Array<{ id: string; name: string; score: number }> {
  const config = loadHeuristicsConfig();
  const heuristicMap = new Map(config.heuristics.map((h) => [h.id, h.name]));

  const scorePairs: Array<{ id: string; name: string; score: number }> = [];

  for (const heuristic of config.heuristics) {
    const score = scores[heuristic.id as keyof HeuristicScores];
    if (typeof score === 'number') {
      scorePairs.push({
        id: heuristic.id,
        name: heuristic.name,
        score,
      });
    }
  }

  return scorePairs.sort((a, b) => b.score - a.score).slice(0, n);
}

/**
 * Get the bottom N heuristics by score
 */
export function getBottomHeuristics(
  scores: HeuristicScores,
  n: number = 3
): Array<{ id: string; name: string; score: number }> {
  const config = loadHeuristicsConfig();

  const scorePairs: Array<{ id: string; name: string; score: number }> = [];

  for (const heuristic of config.heuristics) {
    const score = scores[heuristic.id as keyof HeuristicScores];
    if (typeof score === 'number') {
      scorePairs.push({
        id: heuristic.id,
        name: heuristic.name,
        score,
      });
    }
  }

  return scorePairs.sort((a, b) => a.score - b.score).slice(0, n);
}

/**
 * Format heuristic scores as a table row
 */
export function formatScoresAsTableRow(scores: HeuristicScores): string {
  const config = loadHeuristicsConfig();
  const values = config.heuristics.map((h) => {
    const score = scores[h.id as keyof HeuristicScores];
    return typeof score === 'number' ? score.toFixed(1) : 'N/A';
  });

  return `| ${values.join(' | ')} |`;
}

/**
 * Create markdown table header for heuristics
 */
export function getHeuristicsTableHeader(): string {
  const config = loadHeuristicsConfig();
  const names = config.heuristics.map((h) => h.name);
  const separator = config.heuristics.map(() => '---').join(' | ');

  return `| ${names.join(' | ')} |\n| ${separator} |`;
}

/**
 * Round heuristic scores to one decimal place
 */
export function roundHeuristicScores(scores: HeuristicScores): HeuristicScores {
  return {
    clarity: Math.round(scores.clarity * 10) / 10,
    cognitive_load: Math.round(scores.cognitive_load * 10) / 10,
    visual_hierarchy: Math.round(scores.visual_hierarchy * 10) / 10,
    feedback: Math.round(scores.feedback * 10) / 10,
    accessibility: Math.round(scores.accessibility * 10) / 10,
    conversion_strength: Math.round(scores.conversion_strength * 10) / 10,
  };
}
