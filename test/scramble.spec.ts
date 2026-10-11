import { describe, expect, test } from "vitest";
import { Cube } from "../src/cube";
import {
  baseFace,
  generateScramble,
  parseScramble,
} from "../src/scramble";

describe("Scramble Generator", () => {
  test("generates default 20 moves", () => {
    const scramble = generateScramble();
    const moves = parseScramble(scramble);
    expect(moves.length).toBe(20);
  });

  test("generates custom length", () => {
    const scramble = generateScramble(15);
    const moves = parseScramble(scramble);
    expect(moves.length).toBe(15);
  });

  test("generates valid WCA moves without consecutive same faces", () => {
    for (let i = 0; i < 50; i++) {
      const scramble = generateScramble(25);
      const moves = parseScramble(scramble);
      for (let j = 0; j < moves.length - 1; j++) {
        const face1 = baseFace(moves[j]);
        const face2 = baseFace(moves[j + 1]);
        expect(face1).not.toBe(face2);
      }
    }
  });

  test("Cube applies generated scramble without throwing", () => {
    const scramble = generateScramble();
    const cube = Cube.fromScramble(scramble);
    expect(cube.isSolved()).toBe(false);
  });

  test("cube.scramble() scrambles the instance", () => {
    const cube = new Cube();
    expect(cube.isSolved()).toBe(true);
    cube.scramble(20);
    expect(cube.isSolved()).toBe(false);
  });

  test("Cube.scramble() returns a string algorithm", () => {
    const alg = Cube.scramble(20);
    expect(typeof alg).toBe("string");
    expect(parseScramble(alg).length).toBe(20);
  });
});
