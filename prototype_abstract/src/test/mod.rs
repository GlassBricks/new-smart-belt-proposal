pub mod test_case;
use std::cmp::max;

use anyhow::bail;
pub use test_case::*;

use crate::belts::BeltTier;
use crate::{
    pos, smart_belt::{action::Error, LineDrag}, Direction, Position,
    World,
};

pub fn run_test_case(
    world: &World,
    tier: BeltTier,
    y_level: i32,
    max_x: i32,
) -> (World, Vec<(Position, Error)>) {
    let mut world = world.clone();
    let start_pos = pos(0, y_level);
    let end_pos = pos(max_x, y_level);
    let mut drag = LineDrag::start(&mut world, tier, start_pos, Direction::East);
    drag.interpolate_to(end_pos);
    let errors = drag.get_errors();
    (world, errors)
}

impl World {
    fn max_x(&self) -> i32 {
        self.entities.keys().map(|pos| pos.x).max().unwrap_or(0)
    }
}

pub fn check_test_case(test: &DragTestCase) -> anyhow::Result<()> {
    let max_x = max(test.before.max_x(), test.after.max_x());
    let (result, errors) = run_test_case(&test.before, test.belt_tier, test.drag_row, max_x);

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
    let expected_errors = test
        .expected_error
        .clone()
        .map(|e| vec![e])
        .unwrap_or_default();

    if errors != expected_errors {
        bail!(
            r#"Expected errors:
{:#?}
Got errors:
{:#?}
"#,
            expected_errors,
            errors
        );
    }

    Ok(())
}
