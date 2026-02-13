import { Direction, type TilePosition } from "../common/geometry"
import type { TestEntity } from "../common/test_entity"
import { assertEntities, setupAndDrag, type BuildModeString, type DragConfig } from "./test_helpers"

describe("forced mode upgrade marker", () => {
  test("underground belt pair gets upgrade marker when dragged with higher tier", () => {
    const before: [TilePosition, TestEntity][] = [
      [
        { x: 2, y: 0 },
        {
          kind: "underground-belt",
          direction: Direction.East,
          tier: 1,
          ioType: "input",
        },
      ],
      [
        { x: 4, y: 0 },
        {
          kind: "underground-belt",
          direction: Direction.East,
          tier: 1,
          ioType: "output",
        },
      ],
    ]

    const after: [TilePosition, TestEntity][] = [
      [
        { x: 0, y: 0 },
        { kind: "ghost-belt", direction: Direction.East, tier: 2 },
      ],
      [
        { x: 1, y: 0 },
        { kind: "ghost-belt", direction: Direction.East, tier: 2 },
      ],
      [
        { x: 2, y: 0 },
        {
          kind: "underground-belt",
          direction: Direction.East,
          tier: 1,
          ioType: "input",
        },
      ],
      [
        { x: 4, y: 0 },
        {
          kind: "underground-belt",
          direction: Direction.East,
          tier: 1,
          ioType: "output",
        },
      ],
      [
        { x: 5, y: 0 },
        { kind: "ghost-belt", direction: Direction.East, tier: 2 },
      ],
    ]

    const drag: DragConfig = {
      startX: 0,
      startY: 0,
      endX: 5,
      endY: 0,
      direction: Direction.East,
      beltName: "fast-transport-belt",
      buildMode: "forced",
    }

    const { surface, bounds } = setupAndDrag(before, after, drag)
    assertEntities(surface, after, bounds)

    const ugInput = surface.find_entities_filtered({
      position: { x: 2.5, y: 0.5 },
      type: "underground-belt",
      limit: 1,
    })[0]!
    const [inputTarget] = ugInput.get_upgrade_target()
    assert(inputTarget !== undefined, "UG input should have upgrade target")
    assert(
      inputTarget!.name === "fast-underground-belt",
      `Expected upgrade target fast-underground-belt, got ${inputTarget!.name}`,
    )

    const ugOutput = surface.find_entities_filtered({
      position: { x: 4.5, y: 0.5 },
      type: "underground-belt",
      limit: 1,
    })[0]!
    const [outputTarget] = ugOutput.get_upgrade_target()
    assert(outputTarget !== undefined, "UG output should have upgrade target")
    assert(
      outputTarget!.name === "fast-underground-belt",
      `Expected upgrade target fast-underground-belt, got ${outputTarget!.name}`,
    )
  })
})

describe("underground orientation", () => {
  test.each([
    ["normal", "normal", "belt", "underground-belt"],
    ["forced", "forced", "ghost-belt", "ghost-underground-belt"],
  ] as const)(
    "correct in %s mode",
    (_, buildMode: BuildModeString, beltKind, ugKind) => {
      const before: [TilePosition, TestEntity][] = [
        [{ x: 3, y: 0 }, { kind: "obstacle" }],
      ]

      const after: [TilePosition, TestEntity][] = [
        [
          { x: 0, y: 0 },
          { kind: beltKind, direction: Direction.East, tier: 1 } as TestEntity,
        ],
        [
          { x: 1, y: 0 },
          { kind: beltKind, direction: Direction.East, tier: 1 } as TestEntity,
        ],
        [
          { x: 2, y: 0 },
          {
            kind: ugKind,
            direction: Direction.East,
            tier: 1,
            ioType: "input",
          } as TestEntity,
        ],
        [{ x: 3, y: 0 }, { kind: "obstacle" }],
        [
          { x: 4, y: 0 },
          {
            kind: ugKind,
            direction: Direction.East,
            tier: 1,
            ioType: "output",
          } as TestEntity,
        ],
        [
          { x: 5, y: 0 },
          { kind: beltKind, direction: Direction.East, tier: 1 } as TestEntity,
        ],
        [
          { x: 6, y: 0 },
          { kind: beltKind, direction: Direction.East, tier: 1 } as TestEntity,
        ],
      ]

      const drag: DragConfig = {
        startX: 0,
        startY: 0,
        endX: 6,
        endY: 0,
        direction: Direction.East,
        beltName: "transport-belt",
        buildMode,
      }

      const { surface, bounds } = setupAndDrag(before, after, drag)
      assertEntities(surface, after, bounds)
    },
  )
})
