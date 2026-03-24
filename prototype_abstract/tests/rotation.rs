mod common;

use std::collections::HashSet;

use prototype_abstract::belts::YELLOW_BELT;
use prototype_abstract::smart_belt::LineDrag;
use prototype_abstract::smart_belt::action::Error;
use prototype_abstract::test_case::{parse_world, print_world};
use prototype_abstract::{Direction, TilePosition, Transform, WorldImpl, pos};

enum DragStep {
    MoveTo(TilePosition),
    Rotate(TilePosition),
}

struct RotationTestCase {
    before: &'static str,
    after: &'static str,
    start: TilePosition,
    direction: Direction,
    steps: Vec<DragStep>,
    expected_errors: HashSet<(TilePosition, Error)>,
}

fn run_rotation_steps(
    world: &mut WorldImpl,
    start: TilePosition,
    direction: Direction,
    steps: &[DragStep],
) -> Vec<(TilePosition, Error)> {
    let mut errors = Vec::new();
    {
        let mut error_handler = |p, e| errors.push((p, e));
        let mut drag =
            LineDrag::start_drag(world, &mut error_handler, YELLOW_BELT, start, direction);
        for step in steps {
            match step {
                DragStep::MoveTo(target) => {
                    drag.interpolate_to(&mut error_handler, *target);
                }
                DragStep::Rotate(cursor) => {
                    let (new_drag, rotated) = drag.rotate(&mut error_handler, *cursor);
                    assert!(rotated, "rotation failed at cursor {:?}", cursor);
                    drag = new_drag;
                }
            }
        }
    }
    errors
}

fn check_rotation_test(test: &RotationTestCase) -> anyhow::Result<()> {
    for (i, transform) in Transform::all_unique_transforms().iter().enumerate() {
        let t_start = transform.transform_position(test.start);
        let t_direction = transform.transform_direction(test.direction);
        let t_steps: Vec<DragStep> = test
            .steps
            .iter()
            .map(|s| match s {
                DragStep::MoveTo(p) => DragStep::MoveTo(transform.transform_position(*p)),
                DragStep::Rotate(p) => DragStep::Rotate(transform.transform_position(*p)),
            })
            .collect();

        let (before_world, _) = parse_world(test.before)?;
        let t_before = before_world.transform_world(transform);

        let (expected_world, _) = parse_world(test.after)?;
        let t_expected = expected_world.transform_world(transform);

        let t_expected_errors: HashSet<(TilePosition, Error)> = test
            .expected_errors
            .iter()
            .map(|(p, e)| (transform.transform_position(*p), e.clone()))
            .collect();

        let mut result = t_before.clone();
        let actual_errors = run_rotation_steps(&mut result, t_start, t_direction, &t_steps);
        let actual_error_set: HashSet<(TilePosition, Error)> = actual_errors.into_iter().collect();

        let bounds = t_before
            .bounds()
            .union(&t_expected.bounds())
            .union(&result.bounds());

        if result != t_expected || actual_error_set != t_expected_errors {
            let mut msg = format!(
                "[transform {}]\n\nBefore:\n{}\n\nExpected:\n{}\n\nGot:\n{}\n",
                i,
                print_world(&t_before, bounds, &[]),
                print_world(
                    &t_expected,
                    bounds,
                    &t_expected_errors.iter().map(|e| e.0).collect::<Vec<_>>()
                ),
                print_world(
                    &result,
                    bounds,
                    &actual_error_set.iter().map(|e| e.0).collect::<Vec<_>>()
                ),
            );
            if actual_error_set != t_expected_errors {
                msg.push_str(&format!(
                    "\nExpected errors: {:?}\nGot errors: {:?}\n",
                    t_expected_errors, actual_error_set
                ));
            }
            anyhow::bail!(msg);
        }
    }
    Ok(())
}

#[test]
fn basic_forward_rotation() {
    common::init_logger();
    check_rotation_test(&RotationTestCase {
        before: "_ _ _\n_ _ _\n_ _ _",
        after: "> > v\n_ _ v\n_ _ _",
        start: pos(0, 0),
        direction: Direction::East,
        steps: vec![
            DragStep::MoveTo(pos(2, 0)),
            DragStep::Rotate(pos(2, 1)),
            DragStep::MoveTo(pos(2, 1)),
        ],
        expected_errors: HashSet::new(),
    })
    .unwrap();
}

#[test]
fn basic_backward_rotation() {
    common::init_logger();
    check_rotation_test(&RotationTestCase {
        before: r#"_ _ _
_ _ _
_ _ _"#,
        after: r#"> > >
^
^"#,
        start: pos(2, 0),
        direction: Direction::East,
        steps: vec![DragStep::MoveTo(pos(0, 0)), DragStep::Rotate(pos(0, 2))],
        expected_errors: HashSet::new(),
    })
    .unwrap();
}

#[test]
fn drag_over_forwards_bend_creates_t_shape() {
    common::init_logger();
    check_rotation_test(&RotationTestCase {
        before: r#"_ _ _
_ _ _
_ _ _"#,
        after: r#"< < <
_ ^ _
_ ^ _"#,
        start: pos(1, 2),
        direction: Direction::North,
        steps: vec![
            DragStep::MoveTo(pos(1, 0)),
            DragStep::Rotate(pos(0, 0)),
            DragStep::MoveTo(pos(2, 0)),
        ],
        expected_errors: HashSet::new(),
    })
    .unwrap();
}

#[test]
fn drag_over_backwards_bend_is_error() {
    common::init_logger();
    check_rotation_test(&RotationTestCase {
        before: "",
        after: r#"_ _ ^ _
_ _ ^ _
> > ^ *>"#,
        start: pos(2, 0),
        direction: Direction::North,
        steps: vec![
            DragStep::MoveTo(pos(2, 2)),
            DragStep::Rotate(pos(0, 2)),
            DragStep::MoveTo(pos(3, 2)),
        ],
        expected_errors: [(pos(3, 2), Error::BeltLineBroken)].into(),
    })
    .unwrap();
}

#[test]
fn rotation_at_output_ug_is_error() {
    common::init_logger();
    check_rotation_test(&RotationTestCase {
        before: r#"_ _ X _ _
_ _ _ _ _
_ _ _ _ _"#,
        after: r#"> >i X >o _
_ _ _ v _
_ _ _ _ _"#,
        start: pos(0, 0),
        direction: Direction::East,
        steps: vec![DragStep::MoveTo(pos(3, 0)), DragStep::Rotate(pos(3, 1))],
        expected_errors: [(pos(3, 0), Error::EntityInTheWay)].into(),
    })
    .unwrap();
}

#[test]
fn rotation_over_obstacle_is_error() {
    common::init_logger();
    check_rotation_test(&RotationTestCase {
        before: r#"_ _ X X _
_ _ _ _ _
_ _ _ _ _"#,
        after: r#"> > X X _
_ _ _ v _
_ _ _ _ _"#,
        start: pos(0, 0),
        direction: Direction::East,
        steps: vec![DragStep::MoveTo(pos(3, 0)), DragStep::Rotate(pos(3, 1))],
        expected_errors: [(pos(3, 0), Error::EntityInTheWay)].into(),
    })
    .unwrap();
}
