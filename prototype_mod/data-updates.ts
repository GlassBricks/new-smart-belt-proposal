import {
  Data,
  ItemPrototype,
  SimpleEntityWithOwnerPrototype,
  TrivialSmokePrototype,
} from "factorio:prototype"

declare const data: Data

for (const [name, beltEntity] of pairs(data.raw["transport-belt"])) {
  if (!beltEntity.related_underground_belt) continue
  let beltItem = data.raw.item[name]!
  let newItem: ItemPrototype = {
    type: "item",
    name: "smarter-" + name,
    icons: [
      {
        icon: beltItem.icon!,
        icon_size: beltItem.icon_size,
        tint: [0.5, 0.8, 0.5],
      },
    ],
    localised_name: ["", "Smarter ", ["entity-name." + beltEntity.name]],
    subgroup: "belt",
    order: "z[smarter-belt]" + beltItem.order,
    place_result: "smarter-" + name,
    stack_size: 100,
    flags: ["spawnable"],
  }
  let newEntity: SimpleEntityWithOwnerPrototype = {
    type: "simple-entity-with-owner",
    name: "smarter-" + name,
    icon: beltEntity.icon,
    icon_size: beltEntity.icon_size,
    order: beltEntity.order,
    collision_box: [
      [-0.4, -0.4],
      [0.4, 0.4],
    ],
    selection_box: [
      [-0.4, -0.4],
      [0.4, 0.4],
    ],
    collision_mask: {
      layers: {},
    },
    flags: ["player-creation"],
    hidden: true,
    picture: {
      north: {
        filename: "__smarter-belt__/graphics/arrow_up_64.png",
        size: 64,
        scale: 0.5,
      },
      east: {
        filename: "__smarter-belt__/graphics/arrow_right_64.png",
        size: 64,
        scale: 0.5,
      },
      south: {
        filename: "__smarter-belt__/graphics/arrow_down_64.png",
        size: 64,
        scale: 0.5,
      },
      west: {
        filename: "__smarter-belt__/graphics/arrow_left_64.png",
        size: 64,
        scale: 0.5,
      },
    },
    build_sound: { filename: "__core__/sound/silence-1sec.ogg" },
    created_smoke: {
      type: "create-trivial-smoke",
      smoke_name: "smarter-belt-empty-smoke",
    },
  }
  const smoke: TrivialSmokePrototype = {
    type: "trivial-smoke",
    name: "smarter-belt-empty-smoke",
    animation: {
      filename: "__core__/graphics/empty.png",
      size: [1, 1],
      frame_count: 8,
    },
    duration: 1,
  }
  data.extend([newEntity, newItem, smoke])
}
