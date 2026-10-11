import { LETTER_SCHEME_MAP, type Orientation } from "./consts";

export type LetterSchemeInput =
  | string
  | string[]
  | Record<string, string>
  | Record<string, { id: number; orientation: Orientation }>;

const FACE_ORDER = ["U", "L", "F", "R", "B", "D"];

/**
 * Returns the sticker ID (e.g. 'U0', 'L3', 'F7') corresponding to an index in the 54-sticker Speffz order.
 */
export function stickerIdForIndex(index: number): string {
  const faceIdx = Math.floor(index / 9);
  const stickerIdx = index % 9;
  return `${FACE_ORDER[faceIdx]}${stickerIdx}`;
}

/**
 * Returns the 0..53 index corresponding to a sticker ID (e.g. 'U0' -> 0, 'L0' -> 9).
 */
export function indexForStickerId(stickerId: string): number {
  const face = stickerId[0].toUpperCase();
  const stickerIdx = parseInt(stickerId.slice(1), 10);
  const faceIdx = FACE_ORDER.indexOf(face);
  if (faceIdx === -1 || isNaN(stickerIdx)) return -1;
  return faceIdx * 9 + stickerIdx;
}

export const resolveTargetFlipEdgeIds = (
  targetFlip: number[],
): [number, number] | null => {
  if (targetFlip.length !== 2) return null;

  const resolvedIds = targetFlip.map((value) => {
    const schemeEntry = LETTER_SCHEME_MAP[value];
    if (schemeEntry?.type === "edge") {
      return schemeEntry.id;
    }
    if (value >= 0 && value <= 11) {
      return value;
    }
    return null;
  });

  const [firstId, secondId] = resolvedIds;
  if (firstId === null || secondId === null || firstId === secondId) {
    return null;
  }

  return [firstId, secondId];
};

export const flipTargetEdgeLetter = ({
  currentLetter,
  targetLetter,
  targetFlipEdgeIds,
  letterSchemeMap,
}: {
  currentLetter: string;
  targetLetter: string;
  targetFlipEdgeIds: [number, number] | null;
  letterSchemeMap: Record<string, { id: number; orientation: Orientation }>;
}): string => {
  if (!targetFlipEdgeIds) return targetLetter;

  const currentTarget = letterSchemeMap[targetLetter];
  if (!currentTarget) return targetLetter;

  const [firstId, secondId] = targetFlipEdgeIds;
  const flippedId =
    currentTarget.id === firstId
      ? secondId
      : currentTarget.id === secondId
        ? firstId
        : currentTarget.id;

  if (flippedId === currentTarget.id) {
    return targetLetter;
  }

  const flippedTarget = Object.keys(letterSchemeMap).find(
    (letter) =>
      letterSchemeMap[letter].id === flippedId &&
      letterSchemeMap[letter].orientation === currentTarget.orientation,
  );

  if (!flippedTarget || flippedTarget === currentLetter) {
    return targetLetter;
  }

  return flippedTarget;
};

export const computeLetterSchemeMap = (
  letterScheme: LetterSchemeInput,
  type: "edge" | "corner" = "edge",
): Record<string, { id: number; orientation: Orientation }> => {
  // If already a precomputed map
  if (
    typeof letterScheme === "object" &&
    letterScheme !== null &&
    !Array.isArray(letterScheme) &&
    Object.values(letterScheme).some(
      (v) =>
        typeof v === "object" &&
        v !== null &&
        "id" in v &&
        "orientation" in v,
    )
  ) {
    return letterScheme as Record<string, { id: number; orientation: Orientation }>;
  }

  // Convert letterScheme to an array of 54 string tokens
  let tokens: string[];

  if (Array.isArray(letterScheme)) {
    tokens = letterScheme;
  } else if (typeof letterScheme === "object" && letterScheme !== null) {
    // Record<string, string> of stickerId (e.g. "U0", "D8") -> letter
    tokens = [];
    for (let i = 0; i < 54; i++) {
      const sid = stickerIdForIndex(i);
      tokens.push((letterScheme as Record<string, string>)[sid] || "");
    }
  } else if (typeof letterScheme === "string") {
    if (letterScheme.includes(",")) {
      tokens = letterScheme.split(",").map((s) => s.trim());
    } else {
      tokens = letterScheme.split("");
    }
  } else {
    tokens = [];
  }

  const result: Record<string, { id: number; orientation: Orientation }> = {};

  for (let i = 0; i < LETTER_SCHEME_MAP.length; i++) {
    const token = (tokens[i] ?? "").trim();
    if (!token) continue;

    if (LETTER_SCHEME_MAP[i].type === type) {
      result[token] = {
        id: LETTER_SCHEME_MAP[i].id,
        orientation: LETTER_SCHEME_MAP[i].orientation,
      };
    }
  }

  return result;
};

/**
 * Groups an array of tokens into pairs of 2. If the count is odd,
 * the last element remains as a single-element array (indicating parity).
 */
export function chunkIntoPairs(tokens: string[]): string[][] {
  const pairs: string[][] = [];
  for (let i = 0; i < tokens.length; i += 2) {
    if (i + 1 < tokens.length) {
      pairs.push([tokens[i], tokens[i + 1]]);
    } else {
      pairs.push([tokens[i]]);
    }
  }
  return pairs;
}
