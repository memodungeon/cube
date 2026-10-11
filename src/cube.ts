import { SPEFFZ } from "./letterSchemes";
import {
  U,
  F,
  L,
  D,
  B,
  R,
  centerColor,
  cornerColor,
  edgeColor,
  cornerFacelet,
  edgeFacelet,
  faceNums,
  faceNames,
  MOVES,
  type MoveDefinition,
  type Orientation,
} from "./consts";
import {
  computeLetterSchemeMap,
  flipTargetEdgeLetter,
  resolveTargetFlipEdgeIds,
  chunkIntoPairs,
  type LetterSchemeInput,
} from "./helpers";
import { generateScramble, type ScrambleOptions } from "./scramble";

export interface BldMemoResult {
  edges: string[][];
  corners: string[][];
  edgeTokens: string[];
  cornerTokens: string[];
  hasParity: boolean;
}

export type CubeState = {
  center: number[];
  cp: number[];
  co: number[];
  ep: number[];
  eo: number[];
};

export class Cube {
  center: number[];
  cp: number[];
  co: number[];
  ep: number[];
  eo: number[];
  newCenter: number[];
  newCp: number[];
  newEp: number[];
  newCo: number[];
  newEo: number[];

  constructor(other?: CubeState) {
    if (other) {
      // init
      this.center = [...other.center];
      this.cp = [...other.cp];
      this.co = [...other.co];
      this.ep = [...other.ep];
      this.eo = [...other.eo];
    } else {
      // identity
      this.center = [0, 1, 2, 3, 4, 5];
      this.cp = [0, 1, 2, 3, 4, 5, 6, 7];
      this.ep = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      this.co = new Array(8).fill(0);
      this.eo = new Array(12).fill(0);
    }
    // For moves to avoid allocating new objects each time
    this.newCenter = new Array(6).fill(0);
    this.newCp = new Array(8).fill(0);
    this.newEp = new Array(12).fill(0);
    this.newCo = new Array(8).fill(0);
    this.newEo = new Array(12).fill(0);
  }

  toJSON() {
    return {
      center: this.center,
      cp: this.cp,
      co: this.co,
      ep: this.ep,
      eo: this.eo,
    };
  }

  clone() {
    return new Cube(this.toJSON());
  }

  toString() {
    let corner, edge, i, k, l, m, n, o, ori, p;
    const result = [];
    for (i = k = 0; k <= 5; i = ++k) {
      result[9 * i + 4] = centerColor[this.center[i]];
    }
    for (i = l = 0; l <= 7; i = ++l) {
      corner = this.cp[i];
      ori = this.co[i];
      for (n = m = 0; m <= 2; n = ++m) {
        result[cornerFacelet[i][(n + ori) % 3]] = cornerColor[corner][n];
      }
    }
    for (i = o = 0; o <= 11; i = ++o) {
      edge = this.ep[i];
      ori = this.eo[i];
      for (n = p = 0; p <= 1; n = ++p) {
        result[edgeFacelet[i][(n + ori) % 2]] = edgeColor[edge][n];
      }
    }
    return result.join("");
  }

  static fromString(str: string): Cube {
    const cube = new Cube();
    for (let i = 0; i <= 5; i++) {
      for (let j = 0; j <= 5; j++) {
        if (str[9 * i + 4] === centerColor[j]) {
          cube.center[i] = j;
          break;
        }
      }
    }
    // corners
    for (let i = 0; i <= 7; i++) {
      let ori = 0;
      for (let o = 0; o <= 2; o++) {
        const faceletColor = str[cornerFacelet[i][o]];
        if (faceletColor === "U" || faceletColor === "D") {
          ori = o;
          break;
        }
      }
      const col1 = str[cornerFacelet[i][(ori + 1) % 3]];
      const col2 = str[cornerFacelet[i][(ori + 2) % 3]];
      for (let j = 0; j <= 7; j++) {
        if (col1 === cornerColor[j][1] && col2 === cornerColor[j][2]) {
          cube.cp[i] = j;
          cube.co[i] = ori % 3;
          break;
        }
      }
    }
    // edges
    for (let i = 0; i <= 11; i++) {
      for (let j = 0; j <= 11; j++) {
        // Correct orientation
        if (
          str[edgeFacelet[i][0]] === edgeColor[j][0] &&
          str[edgeFacelet[i][1]] === edgeColor[j][1]
        ) {
          cube.ep[i] = j;
          cube.eo[i] = 0;
          break;
        }
        // Flipped orientation
        if (
          str[edgeFacelet[i][0]] === edgeColor[j][1] &&
          str[edgeFacelet[i][1]] === edgeColor[j][0]
        ) {
          cube.ep[i] = j;
          cube.eo[i] = 1;
          break;
        }
      }
    }
    return cube;
  }

  isSolved(): boolean {
    const clone = this.clone();
    clone.move(clone.upright());
    // Check centers
    for (let cent = 0; cent <= 5; cent++) {
      if (clone.center[cent] !== cent) {
        return false;
      }
    }
    // Check corners (position + orientation)
    for (let c = 0; c <= 7; c++) {
      if (clone.cp[c] !== c || clone.co[c] !== 0) {
        return false;
      }
    }
    // Check edges (position + orientation)
    for (let e = 0; e <= 11; e++) {
      if (clone.ep[e] !== e || clone.eo[e] !== 0) {
        return false;
      }
    }
    return true;
  }

  centerMultiply(other: MoveDefinition): this {
    for (let to = 0; to <= 5; to++) {
      const from = other.center[to];
      this.newCenter[to] = this.center[from];
    }
    [this.center, this.newCenter] = [this.newCenter, this.center];
    return this;
  }

  cornerMultiply(other: MoveDefinition): this {
    for (let to = 0; to <= 7; to++) {
      const from = other.cp[to];
      this.newCp[to] = this.cp[from];
      this.newCo[to] = (this.co[from] + other.co[to]) % 3;
    }
    [this.cp, this.newCp] = [this.newCp, this.cp];
    [this.co, this.newCo] = [this.newCo, this.co];
    return this;
  }

  edgeMultiply(other: MoveDefinition): this {
    for (let to = 0; to <= 11; to++) {
      const from = other.ep[to];
      this.newEp[to] = this.ep[from];
      this.newEo[to] = (this.eo[from] + other.eo[to]) % 2;
    }
    [this.ep, this.newEp] = [this.newEp, this.ep];
    [this.eo, this.newEo] = [this.newEo, this.eo];
    return this;
  }

  multiply(other: MoveDefinition): this {
    this.centerMultiply(other);
    this.cornerMultiply(other);
    this.edgeMultiply(other);
    return this;
  }

  // Interface for move definitions
  move(arg: string | number[] | number): this {
    const moves = Cube.parseAlg(arg);

    for (const move of moves) {
      const face = Math.floor(move / 3);
      const power = move % 3;

      for (let x = 0; x <= power; x++) {
        this.multiply(MOVES[face]);
      }
    }

    return this;
  }

  /**
   * Generates a random WCA-style scramble algorithm.
   */
  static scramble(options?: number | ScrambleOptions): string {
    return generateScramble(options);
  }

  /**
   * Creates a solved cube and applies the given scramble moves.
   */
  static fromScramble(scramble: string): Cube {
    return new Cube().move(scramble);
  }

  /**
   * Scrambles this cube instance with random WCA-style moves and returns this.
   */
  scramble(options?: number | ScrambleOptions): this {
    const alg = generateScramble(options);
    return this.move(alg);
  }

  /**
   * Applies scramble moves to this cube (alias for move).
   */
  applyScramble(scramble: string): this {
    return this.move(scramble);
  }

  upright(): string {
    const clone = this.clone();
    const result: string[] = [];
    // Find F face and orient it to front
    let i = 0;
    for (; i <= 5; i++) {
      if (clone.center[i] === F) break;
    }
    switch (i) {
      case D:
        result.push("x");
        break;
      case U:
        result.push("x'");
        break;
      case B:
        result.push("x2");
        break;
      case R:
        result.push("y");
        break;
      case L:
        result.push("y'");
    }
    if (result.length) {
      clone.move(result[0]);
    }
    // Find U face and orient it to top
    let j = 0;
    for (; j <= 5; j++) {
      if (clone.center[j] === U) break;
    }
    switch (j) {
      case L:
        result.push("z");
        break;
      case R:
        result.push("z'");
        break;
      case D:
        result.push("z2");
    }
    return result.join(" ");
  }

  /**
   * Traces the 3BLD edge cycles and returns an array of letter tokens.
   */
  to3bldEdgeTokens({
    buffer,
    letterScheme = SPEFFZ,
    edgePriority = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    targetFlip = [],
  }: {
    buffer: string;
    letterScheme?: LetterSchemeInput;
    edgePriority?: number[];
    targetFlip?: number[];
  }): string[] {
    const tokens: string[] = [];
    let nextLetter = buffer;
    const letterSchemeMap = computeLetterSchemeMap(letterScheme, "edge");
    const visitedEdges = new Set<number>();
    while (nextLetter) {
      nextLetter = this.nextEdgeLetter({
        edge: nextLetter,
        buffer,
        edgePriority,
        visitedEdges,
        letterSchemeMap,
        targetFlip,
      });
      if (nextLetter) {
        tokens.push(nextLetter);
      }
    }
    return tokens;
  }

  /**
   * Traces the 3BLD edge cycles and returns a concatenated string of letter targets.
   */
  to3bldEdgePath({
    buffer,
    letterScheme = SPEFFZ,
    edgePriority = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    targetFlip = [],
  }: {
    buffer: string;
    letterScheme?: LetterSchemeInput;
    edgePriority?: number[];
    targetFlip?: number[];
  }): string {
    return this.to3bldEdgeTokens({
      buffer,
      letterScheme,
      edgePriority,
      targetFlip,
    }).join("");
  }

  /**
   * Traces the 3BLD corner cycles and returns an array of letter tokens.
   */
  to3bldCornerTokens({
    buffer,
    letterScheme = SPEFFZ,
    cornerPriority = [0, 1, 2, 3, 4, 5, 6, 7],
  }: {
    buffer: string;
    letterScheme?: LetterSchemeInput;
    cornerPriority?: number[];
  }): string[] {
    const tokens: string[] = [];
    let nextLetter = buffer;
    const letterSchemeMap = computeLetterSchemeMap(letterScheme, "corner");
    const visitedCorners = new Set<number>();
    while (nextLetter) {
      nextLetter = this.nextCornerLetter({
        corner: nextLetter,
        buffer,
        cornerPriority,
        visitedCorners,
        letterSchemeMap,
      });
      if (nextLetter) {
        tokens.push(nextLetter);
      }
    }
    return tokens;
  }

  /**
   * Traces the 3BLD corner cycles and returns a concatenated string of letter targets.
   */
  to3bldCornerPath({
    buffer,
    letterScheme = SPEFFZ,
    cornerPriority = [0, 1, 2, 3, 4, 5, 6, 7],
  }: {
    buffer: string;
    letterScheme?: LetterSchemeInput;
    cornerPriority?: number[];
  }): string {
    return this.to3bldCornerTokens({
      buffer,
      letterScheme,
      cornerPriority,
    }).join("");
  }

  /**
   * High-level 3BLD memo generator returning grouped pairs, tokens, and parity.
   */
  to3bldMemo({
    edgeBuffer = "C",
    cornerBuffer = "E",
    letterScheme = SPEFFZ,
    edgePriority,
    cornerPriority,
    targetFlip,
  }: {
    edgeBuffer?: string;
    cornerBuffer?: string;
    letterScheme?: LetterSchemeInput;
    edgePriority?: number[];
    cornerPriority?: number[];
    targetFlip?: number[];
  } = {}): BldMemoResult {
    const edgeTokens = this.to3bldEdgeTokens({
      buffer: edgeBuffer,
      letterScheme,
      edgePriority,
      targetFlip,
    });
    const cornerTokens = this.to3bldCornerTokens({
      buffer: cornerBuffer,
      letterScheme,
      cornerPriority,
    });

    const edges = chunkIntoPairs(edgeTokens);
    const corners = chunkIntoPairs(cornerTokens);
    const hasParity = edgeTokens.length % 2 === 1;

    return {
      edges,
      corners,
      edgeTokens,
      cornerTokens,
      hasParity,
    };
  }

  nextCornerLetter({
    corner,
    buffer,
    visitedCorners = new Set(),
    letterSchemeMap = computeLetterSchemeMap(SPEFFZ, "corner"),
    cornerPriority = [0, 1, 2, 3, 4, 5, 6, 7],
  }: {
    corner: string;
    buffer: string;
    visitedCorners?: Set<number>;
    letterSchemeMap?: Record<string, { id: number; orientation: Orientation }>;
    cornerPriority?: number[];
  }): string {
    const currentLetter = corner;
    const cornerBelongingAtCurrentSlot = letterSchemeMap[currentLetter];
    if (!cornerBelongingAtCurrentSlot) return "";
    const orientationPointer = cornerBelongingAtCurrentSlot.orientation;

    const currentCp = this.cp[cornerBelongingAtCurrentSlot.id];
    const currentCo = this.co[cornerBelongingAtCurrentSlot.id];

    const targets = Object.keys(letterSchemeMap)
      .filter((letter) => letterSchemeMap[letter].id === currentCp)
      .map((letter) => ({
        letter,
        orientation: letterSchemeMap[letter].orientation,
      }));

    const bufferCornerId = letterSchemeMap[buffer]?.id;
    const currentCornerIsSolved =
      currentCp === cornerBelongingAtCurrentSlot.id && currentCo === 0;

    if (
      targets.some((t) => t.letter === buffer) ||
      currentCornerIsSolved ||
      visitedCorners.has(cornerBelongingAtCurrentSlot.id)
    ) {
      const nextCornerId = cornerPriority.find(
        (cornerId) =>
          cornerId !== bufferCornerId && // ignore buffer edge -- could just add it to visited every time
          cornerId !== cornerBelongingAtCurrentSlot.id && // ignore buffer slot/edge
          !visitedCorners.has(cornerId) &&
          this.cp[cornerId] !== bufferCornerId && // ignore edge belonging to buffer that will solve automatically
          // don't pick fully solved edge
          (this.cp[cornerId] !== cornerId || // edge that is not in its place
            (this.cp[cornerId] === cornerId && this.co[cornerId] !== 0)), // or its in its place but not oriented
      );
      if (nextCornerId === undefined) {
        return "";
      }
      const nextLetter = Object.keys(letterSchemeMap).find(
        (letter) =>
          letterSchemeMap[letter].id === nextCornerId &&
          letterSchemeMap[letter].orientation === 0,
      );
      if (!nextLetter) throw new Error("no next letter");
      return nextLetter;
    }
    visitedCorners.add(cornerBelongingAtCurrentSlot.id);

    const targetOrientation = (orientationPointer + 3 - currentCo) % 3;
    const target = targets.find(
      (t) => t.orientation === targetOrientation,
    )?.letter;
    if (!target) throw new Error("no target");

    return target;
  }

  nextEdgeLetter({
    edge,
    buffer,
    visitedEdges = new Set(),
    letterSchemeMap = computeLetterSchemeMap(SPEFFZ, "edge"),
    edgePriority = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    targetFlip = [],
  }: {
    edge: string;
    buffer: string;
    visitedEdges?: Set<number>;
    letterSchemeMap?: Record<string, { id: number; orientation: Orientation }>;
    edgePriority?: number[];
    targetFlip?: number[];
  }): string {
    const currentLetter = edge;
    const edgeBelongingAtCurrentSlot = letterSchemeMap[currentLetter];
    if (!edgeBelongingAtCurrentSlot) return "";
    const orientationPointer = edgeBelongingAtCurrentSlot.orientation;
    const targetFlipEdgeIds = resolveTargetFlipEdgeIds(targetFlip);
    const bufferEdgeId = letterSchemeMap[buffer]?.id;
    if (
      targetFlipEdgeIds &&
      bufferEdgeId !== undefined &&
      targetFlipEdgeIds.includes(bufferEdgeId)
    ) {
      throw new Error("dont flip the buffer");
    }

    const currentEp = this.ep[edgeBelongingAtCurrentSlot.id];
    const currentEo = this.eo[edgeBelongingAtCurrentSlot.id];

    const targets = Object.keys(letterSchemeMap)
      .filter((letter) => letterSchemeMap[letter].id === currentEp)
      .map((letter) => ({
        letter,
        orientation: letterSchemeMap[letter].orientation,
      }));

    const currentEdgeIsSolved =
      currentEp === edgeBelongingAtCurrentSlot.id &&
      currentEo === orientationPointer;
    if (
      // handle cycle
      targets.some((t) => t.letter === buffer) ||
      currentEdgeIsSolved ||
      visitedEdges.has(edgeBelongingAtCurrentSlot.id)
    ) {
      const nextEdgeId = edgePriority.find(
        (edgeId) => {
          let effectiveEdgeId = edgeId;
          if (targetFlipEdgeIds) {
            const [firstId, secondId] = targetFlipEdgeIds;
            if (edgeId === firstId) effectiveEdgeId = secondId;
            else if (edgeId === secondId) effectiveEdgeId = firstId;
          }
          return (
          edgeId !== bufferEdgeId && // ignore buffer edge -- could just add it to visited every time
          edgeId !== edgeBelongingAtCurrentSlot.id && // ignore buffer slot/edge
          !visitedEdges.has(edgeId) &&
          !visitedEdges.has(effectiveEdgeId) &&
          this.ep[effectiveEdgeId] !== bufferEdgeId && // ignore edge belonging to buffer that will solve automatically
          // don't pick fully solved edge
          (this.ep[edgeId] !== edgeId || // edge that is not in its place
            (this.ep[edgeId] === edgeId && this.eo[edgeId] === 1))
          ); // or its in its place but not oriented
        },
      );
      if (nextEdgeId === undefined) {
        return "";
      }
      const nextLetter = Object.keys(letterSchemeMap).find(
        (letter) =>
          letterSchemeMap[letter].id === nextEdgeId &&
          letterSchemeMap[letter].orientation === 0,
      );
      if (!nextLetter) throw new Error("no next letter");
      return flipTargetEdgeLetter({
        currentLetter,
        targetLetter: nextLetter,
        targetFlipEdgeIds,
        letterSchemeMap,
      });
    }

    visitedEdges.add(edgeBelongingAtCurrentSlot.id);

    const currentEdgeIsOriented = currentEo === 0;
    const flippedOrientationPointer = orientationPointer === 0 ? 1 : 0;
    const targetOrientation = currentEdgeIsOriented
      ? orientationPointer
      : flippedOrientationPointer;
    const target = targets.find(
      (t) => t.orientation === targetOrientation,
    )?.letter;
    if (!target) throw new Error("no target");
    return flipTargetEdgeLetter({
      currentLetter,
      targetLetter: target,
      targetFlipEdgeIds,
      letterSchemeMap,
    });
  }

  static parseAlg(arg: string | number[] | number): number[] {
    if (typeof arg === "string") {
      const parts = arg.split(/\s+/);
      const results: number[] = [];
      for (const part of parts) {
        if (part.length === 0) continue;
        if (part.length > 2) {
          throw new Error(`Invalid move: ${part}`);
        }
        const faceNum = faceNums[part[0]];
        if (faceNum === undefined) {
          throw new Error(`Invalid move: ${part}`);
        }
        let power = 0;
        if (part.length === 2) {
          if (part[1] === "2") power = 1;
          else if (part[1] === "'") power = 2;
          else throw new Error(`Invalid move: ${part}`);
        }

        results.push(faceNum * 3 + power);
      }
      return results;
    } else if (Array.isArray(arg)) {
      return arg;
    } else {
      return [arg];
    }
  }

  static inverse(arg: string | number[] | number): string | number[] | number {
    const moves = Cube.parseAlg(arg);
    const result = moves
      .map((move) => {
        // change prime move to non prime
        // do nothing for "x2" moves
        const face = Math.floor(move / 3) | 0;
        const power = move % 3;
        return face * 3 + -(power - 1) + 1;
      })
      .reverse();

    if (typeof arg === "string") {
      let str = "";
      for (const move of result) {
        const face = Math.floor(move / 3);
        const power = move % 3;
        str += faceNames[face];
        if (power === 1) str += "2";
        else if (power === 2) str += "'";
        str += " ";
      }
      return str.trim();
    } else if (Array.isArray(arg)) {
      return result;
    } else {
      return result[0];
    }
  }
}
