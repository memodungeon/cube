# @memodungeon/cube

Small TypeScript Rubik's Cube library with:

- cube state model (`Cube`)
- algorithm parsing/inversion helpers
- WCA scramble generator (`generateScramble`, `Cube.scramble`, `Cube.fromScramble`)
- 3BLD edge/corner path & memo helpers (`to3bldMemo`, `to3bldEdgeTokens`, `to3bldCornerTokens`)
- built-in letter schemes (`SPEFFZ`, `SPEFCZ`, `CHS`) and support for custom token arrays (e.g. Spanish `CH`/`Ñ`) or sticker maps
- it's based on https://github.com/ldez/cubejs but rewritten to TypeScript with custom logic in (3x3 blind solver mainly) and custom additional unit tests

## Install

```bash
pnpm add @memodungeon/cube
# or npm i @memodungeon/cube
```

## Usage

```ts
import { Cube } from "@memodungeon/cube";

const cube = new Cube();
cube.move("R U R' U'"); // sexy move

console.log(cube.toString());
console.log(cube.isSolved());
```

### Scrambles

```ts
import { Cube, generateScramble } from "@memodungeon/cube";

// generate random 20-move WCA scramble
const scramble = generateScramble();

// instantiate a cube from a scramble
const cube = Cube.fromScramble(scramble);

// or scramble an existing cube instance
cube.scramble();
```

### 3BLD edge path

```ts
import { Cube, SPEFCZ } from "@memodungeon/cube";

const cube = new Cube().move("D2 L' D' B2 U2 B2 L' R' D2 L' U2 L' B2 R2 B U R' F2 L' B' F");
const path = cube.to3bldEdgePath({
  buffer: "U",
  letterScheme: SPEFCZ,
  targetFlip: [3, 1], // treat edge 3 as 1 for dealing with parity
});

console.log(path);
```

### 3BLD memo (pairs & parity)

```ts
import { Cube, SPEFFZ } from "@memodungeon/cube";

const cube = Cube.fromScramble("L2 U L2 B D' R2 F2 L B R2 D L2 U' F2 U L2 U2 F2 L2 U' B2");
const memo = cube.to3bldMemo({
  edgeBuffer: "C",
  cornerBuffer: "E",
  letterScheme: SPEFFZ,
});

console.log(memo.corners); // [["N", "S"], ["W", "G"], ["C", "M"], ["D", "V"], ["D"]]
console.log(memo.hasParity); // true
```

### Custom letter schemes

```ts
// Custom token arrays allow multi-character tokens (e.g. digraphs like 'CH'):
const customTokens = SPEFFZ.split("").map((t) => (t === "D" ? "CH" : t));

const tokens = cube.to3bldCornerTokens({
  buffer: "E",
  letterScheme: customTokens,
});
console.log(tokens); // ["N", "S", "W", "G", "C", "M", "CH", "V", "CH"]
```

## API (main exports)

- `Cube`, `CubeState`, `BldMemoResult`
- `generateScramble`, `parseScramble`, `baseFace`, `ScrambleOptions`
- `computeLetterSchemeMap`, `flipTargetEdgeLetter`, `resolveTargetFlipEdgeIds`, `chunkIntoPairs`
- `stickerIdForIndex`, `indexForStickerId`, `LetterSchemeInput`
- `SPEFFZ`, `SPEFCZ`, `CHS`

## Development

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
```

## License

MIT
