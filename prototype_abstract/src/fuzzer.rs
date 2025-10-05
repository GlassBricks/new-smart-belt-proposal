use crate::{
    BELT_TIERS, Belt, BeltConnectableEnum, BeltTier, Colliding, Direction, Entity, Impassable,
    LoaderLike, Splitter, TilePosition, UndergroundBelt, WorldImpl, pos,
    smart_belt::{LineDrag, action::Error},
    world::ReadonlyWorld,
};
use rand::Rng;
use std::collections::HashSet;

#[derive(Debug, Clone)]
pub struct FuzzConfig {
    pub world_width: i32,
    pub entity_density: f32, // 0.0 to 1.0
}

impl Default for FuzzConfig {
    fn default() -> Self {
        Self {
            world_width: 20,
            entity_density: 0.3,
        }
    }
}

/// A randomly generated test case
#[derive(Debug)]
pub struct FuzzTestCase {
    pub world: WorldImpl,
    pub max_x: i32,
    pub tier: BeltTier,
    pub seed: u64,
}
impl FuzzTestCase {
    pub fn start_pos(&self) -> TilePosition {
        pos(0, 1)
    }
    pub fn end_pos(&self) -> TilePosition {
        pos(self.max_x, 1)
    }
}
const BELT_DIRECTION: Direction = Direction::East;

/// Result of running a fuzz test
#[derive(Debug)]
pub struct FuzzResult {
    pub world_before: WorldImpl,
    pub world_after: WorldImpl,
    pub errors: HashSet<(TilePosition, Error)>,
    pub tier: BeltTier,
    pub max_x: i32,
    pub furthest_placement: i32,
}

/// Generate a random world with entities
/// Uses world pooling to reduce allocations
/// Optimized for East-only dragging: places most entities in the middle row (y=1)
/// and only places specific belt configurations in adjacent rows
pub fn generate_random_world<R: Rng>(rng: &mut R, config: &FuzzConfig) -> WorldImpl {
    let mut world = WorldImpl::with_capacity(100);

    for x in 0..config.world_width {
        if !rng.gen_bool(config.entity_density as f64) {
            continue;
        }

        let entity = generate_random_entity(rng);
        let is_belt = entity.as_belt().is_some();
        let _ = world.try_build(pos(x, 1), entity);

        if is_belt {
            // 30% chance to place a belt above or below the drag row
            if rng.gen_bool(0.3) {
                // Place a belt above (y=0) facing down (South)
                let above_pos = pos(x, 0);
                let above_belt = Belt::new(Direction::South, random_tier(rng));
                let _ = world.try_build(above_pos, above_belt);
            }
            if rng.gen_bool(0.3) {
                // Place a belt below (y=2) facing up (North)
                let below_pos = pos(x, 2);
                let below_belt = Belt::new(Direction::North, random_tier(rng));
                let _ = world.try_build(below_pos, below_belt);
            }
        };
    }

    world
}

/// Generate a random entity
fn generate_random_entity<R: Rng>(rng: &mut R) -> Box<dyn Entity> {
    let entity_type = rng.gen_range(0..6);
    let direction = random_direction(rng);
    let tier = random_tier(rng);

    match entity_type {
        0 => Belt::new(direction, tier),
        1 => UndergroundBelt::new(direction, rng.gen_bool(0.5), tier),
        2 => Splitter::new(direction, tier),
        3 => LoaderLike::new(direction, rng.gen_bool(0.5), tier),
        4 => Colliding::new(),
        _ => Impassable::new(),
    }
}

fn random_direction<R: Rng>(rng: &mut R) -> Direction {
    match rng.gen_range(0..4) {
        0 => Direction::North,
        1 => Direction::East,
        2 => Direction::South,
        _ => Direction::West,
    }
}

fn random_tier<R: Rng>(rng: &mut R) -> BeltTier {
    BELT_TIERS[rng.gen_range(0..BELT_TIERS.len())]
}

pub fn generate_test_case<R: Rng>(rng: &mut R, config: &FuzzConfig) -> FuzzTestCase {
    FuzzTestCase {
        world: generate_random_world(rng, config),
        tier: random_tier(rng),
        max_x: config.world_width - 1,
        seed: rng.r#gen(),
    }
}

/// Run a fuzz test case
/// Uses world pooling to reduce allocations
pub fn run_fuzz_test(test_case: &FuzzTestCase) -> FuzzResult {
    let start_pos = test_case.start_pos();
    let end_pos = test_case.end_pos();
    let world_before = test_case.world.clone();
    let mut world_after = world_before.clone();
    let mut errors = Vec::new();

    let mut error_handler = |pos, err| {
        errors.push((pos, err));
    };

    let mut drag = LineDrag::start_drag(
        &mut world_after,
        &mut error_handler,
        test_case.tier,
        start_pos,
        BELT_DIRECTION,
    );

    drag.interpolate_to(&mut error_handler, end_pos);
    let furthest_placement = drag.furthest_placement_pos();

    FuzzResult {
        world_before,
        world_after,
        max_x: test_case.max_x,
        errors: errors.into_iter().collect(),
        tier: test_case.tier,
        furthest_placement,
    }
}

fn is_belt_connected_to_previous_tile(world: &WorldImpl, next_distance: i32) -> bool {
    let (last_pos, cur_pos) = (pos(next_distance - 1, 1), pos(next_distance, 1));

    let connects_forward = world.output_direction_at(last_pos) == Some(BELT_DIRECTION)
        && world.input_direction_at(cur_pos) == Some(BELT_DIRECTION);
    if connects_forward {
        return true;
    }
    let opposite_direction = BELT_DIRECTION.opposite();
    world.output_direction_at(last_pos) == Some(opposite_direction)
        && world.input_direction_at(cur_pos) == Some(opposite_direction)
}

/// Scan the belt line from start to end, treating splitters as straight belts
/// Also follows through underground belt pairs
pub fn scan_belt_line(world: &WorldImpl) -> Vec<TilePosition> {
    let mut scan_pos = pos(0, 1);
    let mut result = Vec::new();
    while let Some(belt_connectable) = world.get(scan_pos).and_then(|e| e.as_belt_connectable())
        && is_belt_connected_to_previous_tile(world, scan_pos.x)
    {
        result.push(scan_pos);
        match belt_connectable {
            BeltConnectableEnum::Belt(belt) => {
                if world.belt_is_curved_at(scan_pos, belt) {
                    result.pop(); // exclude this belt
                    break;
                }
            }
            BeltConnectableEnum::UndergroundBelt(ug) => {
                let Some((pair_pos, _)) = world.get_ug_pair(scan_pos, ug) else {
                    break;
                };
                scan_pos = pair_pos;
            }
            BeltConnectableEnum::Splitter(_) => {
                continue;
            }
            BeltConnectableEnum::LoaderLike(_) => {
                break;
            }
        }
        scan_pos.x += 1;
    }

    result
}
/// Check if all belts in the line have the expected tier
pub fn check_belt_line_tier(
    world: &WorldImpl,
    belt_line: &[TilePosition],
    expected_tier: BeltTier,
) -> Result<(), String> {
    belt_line.iter().try_for_each(|&pos| {
        if let Some(entity) = world.get(pos)
            && let Some(belt_connectable) = entity.as_belt_connectable_dyn()
            && !(entity.as_any().is::<LoaderLike>())
            && belt_connectable.tier() != expected_tier
        {
            Err(format!(
                "Belt at position {:?} has tier {:?}, expected {:?}",
                pos,
                belt_connectable.tier(),
                expected_tier
            ))
        } else {
            Ok(())
        }
    })
}

pub fn check_non_integrated_belts_unchanged(
    before: &WorldImpl,
    after: &WorldImpl,
    integrated_positions: &HashSet<TilePosition>,
) -> Result<(), String> {
    for (&pos, entity_before) in &before.entities {
        let is_integrated = integrated_positions.contains(&pos);
        if !is_integrated {
            let before_ent = entity_before.as_belt_connectable();
            let after_ent = after.get(pos).unwrap().as_belt_connectable();
            if before_ent != after_ent {
                return Err(format!(
                    "Belt changed at position {:?}. Before: {:?}, After: {:?}",
                    pos, before_ent, after_ent
                ));
            }
            if let Some(BeltConnectableEnum::Belt(belt)) = before_ent {
                let before_in = before.belt_curved_input_direction(pos, belt.direction);
                let after_in = after.belt_curved_input_direction(pos, belt.direction);
                if before_in != after_in {
                    return Err(format!(
                        "Belt direction changed at position {:?}. Before: {:?}, After: {:?}",
                        pos, before_ent, after_ent
                    ));
                }
            }
        }
    }

    Ok(())
}

/// Main invariant checking function
pub fn check_invariants(result: &FuzzResult) -> Result<(), String> {
    let belt_line = scan_belt_line(&result.world_after);

    // Find the last successfully placed belt position
    let last_placed_pos = if let Some(&last) = belt_line.last() {
        last
    } else {
        // No belts placed - this is fine if there was an error
        if result.errors.is_empty() {
            return Err("No belts placed and no errors reported".to_string());
        }
        return Ok(());
    };

    let actual_end = last_placed_pos.x;
    let expected_end = result.furthest_placement;

    // Invariant 1: If there are no errors, there should be a continuous belt line from beginning to end
    if result.errors.is_empty() && actual_end != expected_end {
        return Err(format!(
            "No errors but belt line ends at x={} instead of x={}",
            actual_end, expected_end
        ));
    }

    // Invariant 2: If the belt line is broken before the end, there must be at least one error
    if actual_end < expected_end && result.errors.is_empty() {
        return Err(format!(
            "Belt line broken at x={} but no errors reported",
            actual_end,
        ));
    }

    // Invariant 3: All belts from the first successfully placed belt to the next must be the placement tier
    check_belt_line_tier(&result.world_after, &belt_line, result.tier)?;

    // Invariant 4: Non-integrated belts should remain unchanged
    let integrated_positions: HashSet<TilePosition> = belt_line.iter().copied().collect();
    check_non_integrated_belts_unchanged(
        &result.world_before,
        &result.world_after,
        &integrated_positions,
    )?;

    Ok(())
}
