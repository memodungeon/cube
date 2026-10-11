export interface ScrambleOptions {
  /**
   * Number of moves to generate. Default is 20 for standard 3x3x3 WCA.
   */
  length?: number;
  /**
   * Set of faces to pick from. Default is ['U', 'D', 'L', 'R', 'F', 'B'].
   */
  faces?: string[];
}

const DEFAULT_FACES = ["U", "D", "L", "R", "F", "B"];
const SUFFIXES = ["", "'", "2"];

const OPPOSITES: Record<string, string[]> = {
  U: ["D"],
  D: ["U"],
  L: ["R"],
  R: ["L"],
  F: ["B"],
  B: ["F"],
};

/**
 * Extracts the base face letter (U, D, L, R, F, B) from a move string.
 */
export function baseFace(move: string): string {
  for (let i = 0; i < move.length; i++) {
    if ("UDRLFB".includes(move[i])) return move[i];
  }
  return move;
}

/**
 * Generates a random WCA-style scramble for a 3x3x3 Rubik's cube.
 *
 * Enforces standard rules:
 * - No two consecutive moves on the same face (e.g., prevents "R R'").
 * - No redundant moves on opposing faces (e.g., prevents "R L R").
 */
export function generateScramble(options: number | ScrambleOptions = 20): string {
  const opts = typeof options === "number" ? { length: options } : options;
  const length = opts.length ?? 20;
  const faces = opts.faces ?? DEFAULT_FACES;
  const moves: string[] = [];

  let prev1: string | null = null;
  let prev2: string | null = null;

  while (moves.length < length) {
    const candidates = faces.filter((f) => {
      const base = baseFace(f);
      if (base === prev1) return false;
      if (
        prev1 !== null &&
        prev2 !== null &&
        base === prev2 &&
        OPPOSITES[prev1]?.includes(base)
      ) {
        return false;
      }
      return true;
    });

    const chosenFace =
      candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : faces[Math.floor(Math.random() * faces.length)];

    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    moves.push(chosenFace + suffix);
    prev2 = prev1;
    prev1 = baseFace(chosenFace);
  }

  return moves.join(" ");
}

/**
 * Parses a scramble string into an array of individual moves.
 */
export function parseScramble(scramble: string): string[] {
  return scramble
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 0);
}
