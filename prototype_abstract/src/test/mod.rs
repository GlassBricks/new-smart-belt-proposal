pub mod test_case;
use std::cmp::max;

use anyhow::bail;
pub use test_case::*;

use crate::{BeltTier, Direction, World, pos, smart_belt::LineDrag};

pub fn run_test_case(world: &World, tier: BeltTier, y_level: i32, max_x: i32) -> World {
    let mut world = world.clone();
    let start_pos = pos(0, y_level);
    let end_pos = pos(max_x, y_level);
    let mut drag = LineDrag::start(&mut world, tier, start_pos, Direction::East);
    drag.interpolate_to(end_pos);

    world
}

impl World {
    fn max_x(&self) -> i32 {
        self.entities.keys().map(|pos| pos.x).max().unwrap_or(0)
    }
}

pub fn check_test_case(test: &DragTestCase) -> anyhow::Result<()> {
    let max_x = max(test.before.max_x(), test.after.max_x());
    let result = run_test_case(&test.before, test.belt_tier, test.drag_row, max_x);

    let expected = &test.after;

    if result != *expected {
        bail!(
            r#"Expected:

{}

Got:

{}

"#,
            print_world(expected),
            print_world(&result)
        );
    }

    Ok(())
}
