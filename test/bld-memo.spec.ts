import { describe, expect, test } from "vitest";
import { Cube } from "../src/cube";
import { SPEFCZ, SPEFFZ } from "../src/letterSchemes";
import {
  chunkIntoPairs,
  computeLetterSchemeMap,
  indexForStickerId,
  stickerIdForIndex,
} from "../src/helpers";

describe("3BLD Memo & Token Helpers", () => {
  test("chunkIntoPairs splits tokens into pairs with parity detection", () => {
    expect(chunkIntoPairs([])).toEqual([]);
    expect(chunkIntoPairs(["A"])).toEqual([["A"]]);
    expect(chunkIntoPairs(["A", "B"])).toEqual([["A", "B"]]);
    expect(chunkIntoPairs(["A", "B", "C"])).toEqual([["A", "B"], ["C"]]);
    expect(chunkIntoPairs(["A", "B", "C", "D"])).toEqual([
      ["A", "B"],
      ["C", "D"],
    ]);
  });

  test("stickerIdForIndex and indexForStickerId mapping", () => {
    expect(stickerIdForIndex(0)).toBe("U0");
    expect(stickerIdForIndex(7)).toBe("U7");
    expect(stickerIdForIndex(8)).toBe("U8");
    expect(stickerIdForIndex(9)).toBe("L0");
    expect(stickerIdForIndex(53)).toBe("D8");

    expect(indexForStickerId("U0")).toBe(0);
    expect(indexForStickerId("U7")).toBe(7);
    expect(indexForStickerId("L0")).toBe(9);
    expect(indexForStickerId("D8")).toBe(53);
  });

  test("to3bldMemo on solved cube returns empty targets and no parity", () => {
    const cube = new Cube();
    const memo = cube.to3bldMemo();
    expect(memo.corners).toEqual([]);
    expect(memo.edges).toEqual([]);
    expect(memo.cornerTokens).toEqual([]);
    expect(memo.edgeTokens).toEqual([]);
    expect(memo.hasParity).toBe(false);
  });

  test("to3bldMemo returns correctly paired targets and parity", () => {
    const cube = new Cube().move(
      "L2 U L2 B D' R2 F2 L B R2 D L2 U' F2 U L2 U2 F2 L2 U' B2",
    );
    const memo = cube.to3bldMemo({
      cornerBuffer: "E",
      edgeBuffer: "U",
      letterScheme: SPEFFZ,
    });

    expect(memo.cornerTokens).toEqual(["N", "S", "W", "G", "C", "M", "D", "V", "D"]);
    expect(memo.corners).toEqual([
      ["N", "S"],
      ["W", "G"],
      ["C", "M"],
      ["D", "V"],
      ["D"],
    ]);
    expect(memo.hasParity).toBe(true);
  });

  test("to3bldCornerTokens preserves multi-character tokens like Spanish 'CH'", () => {
    // Take SPEFFZ and replace 'D' with 'CH' in the token list
    const tokens = SPEFFZ.split("").map((t) => (t === "D" ? "CH" : t));

    const cube = new Cube().move(
      "L2 U L2 B D' R2 F2 L B R2 D L2 U' F2 U L2 U2 F2 L2 U' B2",
    );
    const cornerTokens = cube.to3bldCornerTokens({
      buffer: "E",
      letterScheme: tokens,
    });

    // In SPEFFZ this was "NSWGCMDVD" -> with 'CH', any 'D' should be 'CH'
    expect(cornerTokens).toEqual(["N", "S", "W", "G", "C", "M", "CH", "V", "CH"]);
  });

  test("computeLetterSchemeMap supports sticker map Record<string, string>", () => {
    const stickerMap: Record<string, string> = {
      U0: "A",
      U1: "B",
      U7: "C",
      U8: "D",
    };
    const cornerMap = computeLetterSchemeMap(stickerMap, "corner");
    expect(cornerMap["A"]).toBeDefined();
    expect(cornerMap["D"]).toBeDefined();
  });
});
