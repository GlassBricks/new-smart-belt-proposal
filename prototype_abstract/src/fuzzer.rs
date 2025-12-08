use crate::{
    BELT_TIERS, Belt, BeltCollidable, BeltConnectable, BeltConnectableTrait, BeltTier,
    CollidingEntityOrTile, Direction, ImpassableTile, LoaderLike, Splitter, TilePosition,
    UndergroundBelt, WorldImpl, pos,
    smart_belt::{DragState, DragStateBehavior, LineDrag, action::Error},
    test_case::print_world,
    world::ReadonlyWorld,
};
use euclid::{Box2D, Size2D};
use rand::{Rng, SeedableRng, rngs::StdRng};
use std::collections::HashSet;

/// Error type for fuzzer assertion failures
#[derive(Debug, Clone)]
pub struct FuzzError(pub String, pub Option<TilePosition>);

impl std::fmt::Display for FuzzError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Debug, Clone)]
pub struct FuzzConfig {
    pub world_width: i32,
    pub entity_density: f32, // 0.0 to 1.0
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
        pos(self.max_x + 1, 1)
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
/// Optimized for East-only dragging: places most entities in the middle row (y=1)
/// and only places specific belt configurations in adjacent rows
pub fn generate_random_world<R: Rng>(rng: &mut R, config: &FuzzConfig) -> WorldImpl {
    let mut world = WorldImpl::with_capacity(100);

    for x in 1..config.world_width {
        if !rng.gen_bool(config.entity_density as f64) {
            continue;
        }

        let entity = generate_random_entity(rng);
        let is_belt = matches!(entity, BeltCollidable::Belt(_));
        let _ = world.try_build(pos(x, 1), entity);

        if is_belt {
            // 30% chance to place a belt above or below the drag row
            if rng.gen_bool(0.3) {
                // Place a belt above (y=0) facing down (South)
                let above_pos = pos(x, 0);
                let above_belt = Belt::new(Direction::South, random_tier(rng)).into();
                let _ = world.try_build(above_pos, above_belt);
            }
            if rng.gen_bool(0.3) {
                // Place a belt below (y=2) facing up (North)
                let below_pos = pos(x, 2);
                let below_belt = Belt::new(Direction::North, random_tier(rng)).into();
                let _ = world.try_build(below_pos, below_belt);
            }
        };
    }

    world
}

/// Generate a random entity
fn generate_random_entity<R: Rng>(rng: &mut R) -> BeltCollidable {
    let entity_type = rng.gen_range(0..6);
    let direction = random_direction(rng);
    let tier = random_tier(rng);

    match entity_type {
        0 => Belt::new(direction, tier).into(),
        1 => UndergroundBelt::new(direction, rng.gen_bool(0.5), tier).into(),
        2 => Splitter::new(direction, tier).into(),
        3 => LoaderLike::new(direction, rng.gen_bool(0.5), tier).into(),
        4 => CollidingEntityOrTile.into(),
        _ => ImpassableTile.into(),
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

pub fn generate_test_case(seed: u64, config: &FuzzConfig) -> FuzzTestCase {
    let mut rng = StdRng::seed_from_u64(seed);
    FuzzTestCase {
        seed,
        world: generate_random_world(&mut rng, config),
        tier: random_tier(&mut rng),
        max_x: config.world_width - 1,
    }
}

/// Run a fuzz test case with a specific state implementation
pub fn run_fuzz_test_with_state<S: DragStateBehavior>(test_case: &FuzzTestCase) -> Result<FuzzResult, String> {
    let start_pos = test_case.start_pos();
    let end_pos = test_case.end_pos();
    let world_before = test_case.world.clone();
    let mut world_after = world_before.clone();

    let mut errors = Vec::new();
    let mut error_handler = |pos, err| {
        errors.push((pos, err));
    };
    let furthest_placement = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let mut drag = LineDrag::<S>::start_drag(
            &mut world_after,
            &mut error_handler,
            test_case.tier,
            start_pos,
            BELT_DIRECTION,
        );
        drag.interpolate_to(&mut error_handler, end_pos);
        drag.furthest_placement_pos()
    }))
    .map_err(|panic_info| {
        let panic_message = if let Some(s) = panic_info.downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = panic_info.downcast_ref::<String>() {
            s.clone()
        } else {
            format!("{:?}", panic_info)
        };
        let bounds = Box2D::from_size(Size2D::new(test_case.max_x, 3));
        format!(
            "interpolate_to panicked: {}\nWorld before:\n{}",
            panic_message,
            print_world(&world_before, bounds, &[])
        )
    })?;

    Ok(FuzzResult {
        world_before,
        world_after,
        max_x: test_case.max_x,
        errors: errors.into_iter().collect(),
        tier: test_case.tier,
        furthest_placement,
    })
}

/// Run a fuzz test case using the default DragState implementation
pub fn run_fuzz_test(test_case: &FuzzTestCase) -> Result<FuzzResult, String> {
    run_fuzz_test_with_state::<DragState>(test_case)
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
    let mut iterations = 0;
    const MAX_ITERATIONS: i32 = 100;
    while let Some(belt_connectable) = world.get(scan_pos).and_then(|e| BeltConnectable::try_from(e).ok())
        && (scan_pos.x == 0 || is_belt_connected_to_previous_tile(world, scan_pos.x))
        && iterations < MAX_ITERATIONS
    {
        iterations += 1;
        match &belt_connectable {
            BeltConnectable::Belt(belt) => {
                if world.belt_is_curved_at(scan_pos, belt) {
                    break;
                }
                result.push(scan_pos);
            }
            BeltConnectable::UndergroundBelt(ug) => {
                result.push(scan_pos);
                let Some((pair_pos, _)) = world.get_ug_pair(scan_pos, ug) else {
                    break;
                };
                result.push(pair_pos);
                scan_pos = pair_pos;
            }
            BeltConnectable::Splitter(_) => {
                result.push(scan_pos);
            }
            BeltConnectable::LoaderLike(_) => {
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
) -> Result<(), FuzzError> {
    belt_line.iter().try_for_each(|&pos| {
        if let Some(entity) = world.get(pos)
            && let Ok(belt_connectable) = BeltConnectable::try_from(entity)
            && !matches!(entity, BeltCollidable::LoaderLike(_))
            && belt_connectable.tier() != expected_tier
        {
            Err(FuzzError(
                format!(
                    "Belt at position {:?} has tier {:?}, expected {:?}",
                    pos,
                    belt_connectable.tier(),
                    expected_tier
                ),
                Some(pos),
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
) -> Result<(), FuzzError> {
    for (&pos, entity_before) in &before.entities {
        let is_integrated = integrated_positions.contains(&pos);
        if !is_integrated {
            let after_ent = after.get(pos);
            if after_ent.is_none() {
                // limitation: we may replace some belts
                continue;
            }
            if Some(entity_before) != after_ent {
                return Err(FuzzError(
                    format!(
                        "Belt changed at position {:?}. Before: {:?}, After: {:?}",
                        pos, entity_before, after_ent
                    ),
                    Some(pos),
                ));
            }
            if let BeltCollidable::Belt(belt) = entity_before {
                let before_in = before.belt_curved_input_direction(pos, belt.direction);
                let after_in = after.belt_curved_input_direction(pos, belt.direction);
                if before_in != after_in {
                    return Err(FuzzError(
                        format!(
                            "Belt direction changed at position {:?} {:?}\nBefore in: {:?}\nAfter in {:?}",
                            pos, belt, before_in, after_in
                        ),
                        Some(pos),
                    ));
                }
            }
        }
    }

    Ok(())
}

impl FuzzResult {
    /// Main invariant checking function
    pub fn check(&self) -> Result<(), FuzzError> {
        let belt_line = scan_belt_line(&self.world_after);
        // Find the last successfully placed belt position
        let last_placed_pos = if let Some(&last) = belt_line.last() {
            last
        } else {
            // No belts placed - this is fine if there was an error
            if self.errors.is_empty() {
                return Err(FuzzError(
                    "No belts placed and no errors reported".to_string(),
                    None,
                ));
            }
            return Ok(());
        };

        let actual_end = last_placed_pos.x;
        let expected_end = self.furthest_placement;

        // Invariant 1: If there are no errors, there should be a continuous belt line from beginning to end
        if self.errors.is_empty() && actual_end != expected_end {
            return Err(FuzzError(
                format!(
                    "No errors but belt line ends at x={} instead of x={}",
                    actual_end, expected_end
                ),
                Some(last_placed_pos),
            ));
        }

        // Invariant 2: If the belt line is broken before the end, there must be at least one error
        if actual_end < expected_end && self.errors.is_empty() {
            return Err(FuzzError(
                format!(
                    "Belt line broken at x={} but no errors reported",
                    actual_end,
                ),
                Some(last_placed_pos),
            ));
        }

        if self.errors.is_empty() {
            // Invariant 3: All belts from the first successfully placed belt to the next must be the placement tier
            check_belt_line_tier(&self.world_after, &belt_line, self.tier)?;
            // Invariant 4: Non-integrated belts should remain unchanged
            let integrated_positions: HashSet<TilePosition> = belt_line.iter().copied().collect();
            check_non_integrated_belts_unchanged(
                &self.world_before,
                &self.world_after,
                &integrated_positions,
            )?;
        }

        Ok(())
    }

    pub fn print_before_after(&self, markers: &[TilePosition]) {
        let bounds = self.world_before.bounds().union(&self.world_after.bounds());
        eprintln!(
            r#"
    Before:

{}

    After:

{}
    "#,
            print_world(&self.world_before, bounds, markers),
            print_world(&self.world_after, bounds, markers)
        );
    }
}
