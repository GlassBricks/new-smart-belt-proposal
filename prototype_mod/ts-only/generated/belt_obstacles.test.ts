// Generated test file for belt_obstacles.yaml
import { describe, test, expect } from "bun:test";
import {
  checkTestCaseAllTransforms,
  parseTestCase,
  type DragTestCase,
} from "../test_case";

describe("belt_obstacles", () => {

  test("perpendicular_belt", () => {
    const yamlContent = "name: Perpendicular belt\nbefore: _ _ ^\nafter: '> >i ^ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("perpendicular_belt_reverse", () => {
    const yamlContent = "name: Perpendicular belt\nbefore: _ _ ^\nafter: '> >i ^ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("perpendicular_belt_wiggle", () => {
    const yamlContent = "name: Perpendicular belt\nbefore: _ _ ^\nafter: '> >i ^ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("perpendicular_belt_wiggle_reverse", () => {
    const yamlContent = "name: Perpendicular belt\nbefore: _ _ ^\nafter: '> >i ^ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("multiple_perpendicular_belt", () => {
    const yamlContent = "name: Multiple perpendicular belt\nbefore: _ _ ^ v\nafter: '> >i ^ v >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("multiple_perpendicular_belt_reverse", () => {
    const yamlContent = "name: Multiple perpendicular belt\nbefore: _ _ ^ v\nafter: '> >i ^ v >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("multiple_perpendicular_belt_wiggle", () => {
    const yamlContent = "name: Multiple perpendicular belt\nbefore: _ _ ^ v\nafter: '> >i ^ v >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("multiple_perpendicular_belt_wiggle_reverse", () => {
    const yamlContent = "name: Multiple perpendicular belt\nbefore: _ _ ^ v\nafter: '> >i ^ v >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_curved_belt", () => {
    const yamlContent = "name: Backwards curved belt\nbefore: |\n  _ _ v\n  _ _ <\nafter: |\n  _ _  v _\n  > >i < >o >\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_curved_belt_wiggle", () => {
    const yamlContent = "name: Backwards curved belt\nbefore: |\n  _ _ v\n  _ _ <\nafter: |\n  _ _  v _\n  > >i < >o >\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("forwards_curved_belt", () => {
    const yamlContent = "name: Forwards curved belt\nbefore: |\n  _ _ v\n  _ _ >\nafter: |\n  _ _  v _\n  > >i > >o >\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("forwards_curved_belt_wiggle", () => {
    const yamlContent = "name: Forwards curved belt\nbefore: |\n  _ _ v\n  _ _ >\nafter: |\n  _ _  v _\n  > >i > >o >\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("forwards_curved_belt_continuation", () => {
    const yamlContent = "name: Forwards curved belt continuation\nbefore: |\n  _ _ v\n  _ _ > >\nafter: |\n  _ _  v _\n  > >i > > >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("forwards_curved_belt_continuation_reverse", () => {
    const yamlContent = "name: Forwards curved belt continuation\nbefore: |\n  _ _ v\n  _ _ > >\nafter: |\n  _ _  v _\n  > >i > > >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("forwards_curved_belt_continuation_wiggle", () => {
    const yamlContent = "name: Forwards curved belt continuation\nbefore: |\n  _ _ v\n  _ _ > >\nafter: |\n  _ _  v _\n  > >i > > >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("forwards_curved_belt_continuation_wiggle_reverse", () => {
    const yamlContent = "name: Forwards curved belt continuation\nbefore: |\n  _ _ v\n  _ _ > >\nafter: |\n  _ _  v _\n  > >i > > >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_curved_belt_continuation", () => {
    const yamlContent = "name: Backwards curved belt continuation\nbefore: |\n  _ _ v\n  _ < <\nafter: |\n  _  _ v _\n  >i < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_curved_belt_continuation_reverse", () => {
    const yamlContent = "name: Backwards curved belt continuation\nbefore: |\n  _ _ v\n  _ < <\nafter: |\n  _  _ v _\n  >i < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_curved_belt_continuation_wiggle", () => {
    const yamlContent = "name: Backwards curved belt continuation\nbefore: |\n  _ _ v\n  _ < <\nafter: |\n  _  _ v _\n  >i < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_curved_belt_continuation_wiggle_reverse", () => {
    const yamlContent = "name: Backwards curved belt continuation\nbefore: |\n  _ _ v\n  _ < <\nafter: |\n  _  _ v _\n  >i < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("forwards_curved_belt_continuation_too_long", () => {
    const yamlContent = "name: Forwards curved belt continuation, too long\nbefore: |\n  _ _ v\n  _ _ > > > > >\nafter: |\n  _ _ v   _\n  > > > > > > > *>\nafter_for_reverse: |\n  _ _ v   _\n  > > v > > > > *>\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("forwards_curved_belt_continuation_too_long_reverse", () => {
    const yamlContent = "name: Forwards curved belt continuation, too long\nbefore: |\n  _ _ v\n  _ _ > > > > >\nafter: |\n  _ _ v   _\n  > > > > > > > *>\nafter_for_reverse: |\n  _ _ v   _\n  > > v > > > > *>\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("forwards_curved_belt_continuation_too_long_wiggle", () => {
    const yamlContent = "name: Forwards curved belt continuation, too long\nbefore: |\n  _ _ v\n  _ _ > > > > >\nafter: |\n  _ _ v   _\n  > > > > > > > *>\nafter_for_reverse: |\n  _ _ v   _\n  > > v > > > > *>\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("forwards_curved_belt_continuation_too_long_wiggle_reverse", () => {
    const yamlContent = "name: Forwards curved belt continuation, too long\nbefore: |\n  _ _ v\n  _ _ > > > > >\nafter: |\n  _ _ v   _\n  > > > > > > > *>\nafter_for_reverse: |\n  _ _ v   _\n  > > v > > > > *>\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_curved_belt_continuation_too_long_to_check", () => {
    const yamlContent = "name: Backwards curved belt continuation, too long to check\nbefore: |\n  _ _ _ _ _ v\n  _ < < < < <\nafter: |\n  _ _ _ _ _ v\n  > > > > > < *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_curved_belt_continuation_too_long_to_check_reverse", () => {
    const yamlContent = "name: Backwards curved belt continuation, too long to check\nbefore: |\n  _ _ _ _ _ v\n  _ < < < < <\nafter: |\n  _ _ _ _ _ v\n  > > > > > < *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_curved_belt_continuation_too_long_to_check_wiggle", () => {
    const yamlContent = "name: Backwards curved belt continuation, too long to check\nbefore: |\n  _ _ _ _ _ v\n  _ < < < < <\nafter: |\n  _ _ _ _ _ v\n  > > > > > < *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_curved_belt_continuation_too_long_to_check_wiggle_reverse", () => {
    const yamlContent = "name: Backwards curved belt continuation, too long to check\nbefore: |\n  _ _ _ _ _ v\n  _ < < < < <\nafter: |\n  _ _ _ _ _ v\n  > > > > > < *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("2_backwards_curved_belts", () => {
    const yamlContent = "name: 2 backwards curved belts\nbefore: |\n  _ _ ^ v\n  _ _ ^ <\nafter: |\n  _ _  ^ v _\n  > >i ^ < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("2_backwards_curved_belts_reverse", () => {
    const yamlContent = "name: 2 backwards curved belts\nbefore: |\n  _ _ ^ v\n  _ _ ^ <\nafter: |\n  _ _  ^ v _\n  > >i ^ < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("2_backwards_curved_belts_wiggle", () => {
    const yamlContent = "name: 2 backwards curved belts\nbefore: |\n  _ _ ^ v\n  _ _ ^ <\nafter: |\n  _ _  ^ v _\n  > >i ^ < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("2_backwards_curved_belts_wiggle_reverse", () => {
    const yamlContent = "name: 2 backwards curved belts\nbefore: |\n  _ _ ^ v\n  _ _ ^ <\nafter: |\n  _ _  ^ v _\n  > >i ^ < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("2_forwards_curved_belts", () => {
    const yamlContent = "name: 2 forwards curved belts\nbefore: |\n  _ _ v ^\n  _ _ > ^\nafter: |\n  _ _  v ^ _\n  > >i > ^ >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("2_forwards_curved_belts_reverse", () => {
    const yamlContent = "name: 2 forwards curved belts\nbefore: |\n  _ _ v ^\n  _ _ > ^\nafter: |\n  _ _  v ^ _\n  > >i > ^ >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("2_forwards_curved_belts_wiggle", () => {
    const yamlContent = "name: 2 forwards curved belts\nbefore: |\n  _ _ v ^\n  _ _ > ^\nafter: |\n  _ _  v ^ _\n  > >i > ^ >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("2_forwards_curved_belts_wiggle_reverse", () => {
    const yamlContent = "name: 2 forwards curved belts\nbefore: |\n  _ _ v ^\n  _ _ > ^\nafter: |\n  _ _  v ^ _\n  > >i > ^ >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("sideloaded_belt_is_normal_obstacle", () => {
    const yamlContent = "name: sideloaded belt is normal obstacle\nbefore: |\n  _ _ > ^ <\nafter: |\n  > > >i ^ >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("sideloaded_belt_is_normal_obstacle_reverse", () => {
    const yamlContent = "name: sideloaded belt is normal obstacle\nbefore: |\n  _ _ > ^ <\nafter: |\n  > > >i ^ >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("sideloaded_belt_is_normal_obstacle_wiggle", () => {
    const yamlContent = "name: sideloaded belt is normal obstacle\nbefore: |\n  _ _ > ^ <\nafter: |\n  > > >i ^ >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("sideloaded_belt_is_normal_obstacle_wiggle_reverse", () => {
    const yamlContent = "name: sideloaded belt is normal obstacle\nbefore: |\n  _ _ > ^ <\nafter: |\n  > > >i ^ >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("sideloaded_belt_is_normal_obstacle_2", () => {
    const yamlContent = "name: sideloaded belt is normal obstacle 2\nbefore: |\n  _ _ v\n  _ _ v < _\nafter: |\n  _ _  v\n  > >i v >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("sideloaded_belt_is_normal_obstacle_2_reverse", () => {
    const yamlContent = "name: sideloaded belt is normal obstacle 2\nbefore: |\n  _ _ v\n  _ _ v < _\nafter: |\n  _ _  v\n  > >i v >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("sideloaded_belt_is_normal_obstacle_2_wiggle", () => {
    const yamlContent = "name: sideloaded belt is normal obstacle 2\nbefore: |\n  _ _ v\n  _ _ v < _\nafter: |\n  _ _  v\n  > >i v >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("sideloaded_belt_is_normal_obstacle_2_wiggle_reverse", () => {
    const yamlContent = "name: sideloaded belt is normal obstacle 2\nbefore: |\n  _ _ v\n  _ _ v < _\nafter: |\n  _ _  v\n  > >i v >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("sideloaded_belt_is_not_obstacle", () => {
    const yamlContent = "name: sideloaded belt is not obstacle\nbefore: |\n  _ _ v\n  _ > > _ _\nafter: |\n  _ _ v\n  > > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("sideloaded_belt_is_not_obstacle_reverse", () => {
    const yamlContent = "name: sideloaded belt is not obstacle\nbefore: |\n  _ _ v\n  _ > > _ _\nafter: |\n  _ _ v\n  > > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("sideloaded_belt_is_not_obstacle_wiggle", () => {
    const yamlContent = "name: sideloaded belt is not obstacle\nbefore: |\n  _ _ v\n  _ > > _ _\nafter: |\n  _ _ v\n  > > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("sideloaded_belt_is_not_obstacle_wiggle_reverse", () => {
    const yamlContent = "name: sideloaded belt is not obstacle\nbefore: |\n  _ _ v\n  _ > > _ _\nafter: |\n  _ _ v\n  > > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("curved_belt_after_obstacle_is_obstacle", () => {
    const yamlContent = "name: curved belt after obstacle is obstacle\nbefore: |\n  _ _ v\n  _ X > >\nafter: |\n  _  _ v\n  >i X > > >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("curved_belt_after_obstacle_is_obstacle_reverse", () => {
    const yamlContent = "name: curved belt after obstacle is obstacle\nbefore: |\n  _ _ v\n  _ X > >\nafter: |\n  _  _ v\n  >i X > > >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("curved_belt_after_obstacle_is_obstacle_wiggle", () => {
    const yamlContent = "name: curved belt after obstacle is obstacle\nbefore: |\n  _ _ v\n  _ X > >\nafter: |\n  _  _ v\n  >i X > > >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("curved_belt_after_obstacle_is_obstacle_wiggle_reverse", () => {
    const yamlContent = "name: curved belt after obstacle is obstacle\nbefore: |\n  _ _ v\n  _ X > >\nafter: |\n  _  _ v\n  >i X > > >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_curved_belt_after_obstacle_is_obstacle", () => {
    const yamlContent = "name: backwards curved belt after obstacle is obstacle\nbefore: |\n  _ _ _ v\n  _ X < <\nafter: |\n  _  _ _ v\n  >i X < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_curved_belt_after_obstacle_is_obstacle_reverse", () => {
    const yamlContent = "name: backwards curved belt after obstacle is obstacle\nbefore: |\n  _ _ _ v\n  _ X < <\nafter: |\n  _  _ _ v\n  >i X < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_curved_belt_after_obstacle_is_obstacle_wiggle", () => {
    const yamlContent = "name: backwards curved belt after obstacle is obstacle\nbefore: |\n  _ _ _ v\n  _ X < <\nafter: |\n  _  _ _ v\n  >i X < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_curved_belt_after_obstacle_is_obstacle_wiggle_reverse", () => {
    const yamlContent = "name: backwards curved belt after obstacle is obstacle\nbefore: |\n  _ _ _ v\n  _ X < <\nafter: |\n  _  _ _ v\n  >i X < < >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("running_into_a_curved_belt_is_error", () => {
    const yamlContent = "name: running into a curved belt is error\nbefore: |\n  _ _ ^\n  _ > ^\nafter: |\n  _ _ ^\n  > > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("running_into_a_curved_belt_is_error_reverse", () => {
    const yamlContent = "name: running into a curved belt is error\nbefore: |\n  _ _ ^\n  _ > ^\nafter: |\n  _ _ ^\n  > > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("running_into_a_curved_belt_is_error_wiggle", () => {
    const yamlContent = "name: running into a curved belt is error\nbefore: |\n  _ _ ^\n  _ > ^\nafter: |\n  _ _ ^\n  > > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("running_into_a_curved_belt_is_error_wiggle_reverse", () => {
    const yamlContent = "name: running into a curved belt is error\nbefore: |\n  _ _ ^\n  _ > ^\nafter: |\n  _ _ ^\n  > > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("hovering_over_curved_belt_gives_no_error", () => {
    const yamlContent = "name: hovering over curved belt gives no error\nbefore: |\n  _ _ ^\n  _ > ^\nafter: |\n  _ _ ^\n  > > ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("hovering_over_curved_belt_gives_no_error_reverse", () => {
    const yamlContent = "name: hovering over curved belt gives no error\nbefore: |\n  _ _ ^\n  _ > ^\nafter: |\n  _ _ ^\n  > > ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("hovering_over_curved_belt_gives_no_error_wiggle", () => {
    const yamlContent = "name: hovering over curved belt gives no error\nbefore: |\n  _ _ ^\n  _ > ^\nafter: |\n  _ _ ^\n  > > ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("hovering_over_curved_belt_gives_no_error_wiggle_reverse", () => {
    const yamlContent = "name: hovering over curved belt gives no error\nbefore: |\n  _ _ ^\n  _ > ^\nafter: |\n  _ _ ^\n  > > ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("curvy", () => {
    const yamlContent = "name: curvy\nbefore: |\n  _ _ _ ^ _ _ ^\n  _ _ > ^ _ > ^\n  _ _ ^ _ _ ^ _\nafter: |\n  _  _   _ ^ _ _ ^\n  2> 2>i > ^ _ > ^ 2>o\n  _  _   ^ _ _ ^ _\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("curvy_reverse", () => {
    const yamlContent = "name: curvy\nbefore: |\n  _ _ _ ^ _ _ ^\n  _ _ > ^ _ > ^\n  _ _ ^ _ _ ^ _\nafter: |\n  _  _   _ ^ _ _ ^\n  2> 2>i > ^ _ > ^ 2>o\n  _  _   ^ _ _ ^ _\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("curvy_wiggle", () => {
    const yamlContent = "name: curvy\nbefore: |\n  _ _ _ ^ _ _ ^\n  _ _ > ^ _ > ^\n  _ _ ^ _ _ ^ _\nafter: |\n  _  _   _ ^ _ _ ^\n  2> 2>i > ^ _ > ^ 2>o\n  _  _   ^ _ _ ^ _\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("curvy_wiggle_reverse", () => {
    const yamlContent = "name: curvy\nbefore: |\n  _ _ _ ^ _ _ ^\n  _ _ > ^ _ > ^\n  _ _ ^ _ _ ^ _\nafter: |\n  _  _   _ ^ _ _ ^\n  2> 2>i > ^ _ > ^ 2>o\n  _  _   ^ _ _ ^ _\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("first_belt_shouldn_t_change_effective_curvature", () => {
    const yamlContent = "name: first belt shouldn't change effective curvature\nbefore: |\n  _ ^\n  _ ^ <\nafter: |\n  _  ^\n  >i ^ < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("first_belt_shouldn_t_change_effective_curvature_reverse", () => {
    const yamlContent = "name: first belt shouldn't change effective curvature\nbefore: |\n  _ ^\n  _ ^ <\nafter: |\n  _  ^\n  >i ^ < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("first_belt_shouldn_t_change_effective_curvature_wiggle", () => {
    const yamlContent = "name: first belt shouldn't change effective curvature\nbefore: |\n  _ ^\n  _ ^ <\nafter: |\n  _  ^\n  >i ^ < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("first_belt_shouldn_t_change_effective_curvature_wiggle_reverse", () => {
    const yamlContent = "name: first belt shouldn't change effective curvature\nbefore: |\n  _ ^\n  _ ^ <\nafter: |\n  _  ^\n  >i ^ < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("belt_weaving_over_backwards_belt_segment_with_curve", () => {
    const yamlContent = "name: Belt weaving over backwards belt segment with curve\nbefore: |\n  _ _ _  _  v\n  _ < <o <i <\nafter: |\n  _ _ _  _  v\n  2>i < <o <i < 2>o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("belt_weaving_over_backwards_belt_segment_with_curve_reverse", () => {
    const yamlContent = "name: Belt weaving over backwards belt segment with curve\nbefore: |\n  _ _ _  _  v\n  _ < <o <i <\nafter: |\n  _ _ _  _  v\n  2>i < <o <i < 2>o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("belt_weaving_over_backwards_belt_segment_with_curve_wiggle", () => {
    const yamlContent = "name: Belt weaving over backwards belt segment with curve\nbefore: |\n  _ _ _  _  v\n  _ < <o <i <\nafter: |\n  _ _ _  _  v\n  2>i < <o <i < 2>o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("belt_weaving_over_backwards_belt_segment_with_curve_wiggle_reverse", () => {
    const yamlContent = "name: Belt weaving over backwards belt segment with curve\nbefore: |\n  _ _ _  _  v\n  _ < <o <i <\nafter: |\n  _ _ _  _  v\n  2>i < <o <i < 2>o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("integrating_backwards_belt_segment", () => {
    const yamlContent = "name: Integrating backwards belt segment\nbefore: _ <o <i <\nafter: 2> 2>i 2>o 2>\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("integrating_backwards_belt_segment_reverse", () => {
    const yamlContent = "name: Integrating backwards belt segment\nbefore: _ <o <i <\nafter: 2> 2>i 2>o 2>\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("integrating_backwards_belt_segment_wiggle", () => {
    const yamlContent = "name: Integrating backwards belt segment\nbefore: _ <o <i <\nafter: 2> 2>i 2>o 2>\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("integrating_backwards_belt_segment_wiggle_reverse", () => {
    const yamlContent = "name: Integrating backwards belt segment\nbefore: _ <o <i <\nafter: 2> 2>i 2>o 2>\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("if_can_t_belt_weave_is_error", () => {
    const yamlContent = "name: If can't belt weave, is error\nbefore: |\n  _ _ _  _  v\n  _ < <o <i <\nafter: |\n  _  _ _  _   v\n  > > >i >o *< >\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("if_can_t_belt_weave_is_error_reverse", () => {
    const yamlContent = "name: If can't belt weave, is error\nbefore: |\n  _ _ _  _  v\n  _ < <o <i <\nafter: |\n  _  _ _  _   v\n  > > >i >o *< >\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("if_can_t_belt_weave_is_error_wiggle", () => {
    const yamlContent = "name: If can't belt weave, is error\nbefore: |\n  _ _ _  _  v\n  _ < <o <i <\nafter: |\n  _  _ _  _   v\n  > > >i >o *< >\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("if_can_t_belt_weave_is_error_wiggle_reverse", () => {
    const yamlContent = "name: If can't belt weave, is error\nbefore: |\n  _ _ _  _  v\n  _ < <o <i <\nafter: |\n  _  _ _  _   v\n  > > >i >o *< >\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_ug_belt", () => {
    const yamlContent = "name: backwards segment ending in ug belt\nbefore: |\n  _ < < <o _\nafter: |\n  > > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_ug_belt_reverse", () => {
    const yamlContent = "name: backwards segment ending in ug belt\nbefore: |\n  _ < < <o _\nafter: |\n  > > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_ug_belt_wiggle", () => {
    const yamlContent = "name: backwards segment ending in ug belt\nbefore: |\n  _ < < <o _\nafter: |\n  > > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_ug_belt_wiggle_reverse", () => {
    const yamlContent = "name: backwards segment ending in ug belt\nbefore: |\n  _ < < <o _\nafter: |\n  > > > > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_loader", () => {
    const yamlContent = "name: backwards segment ending in loader\nbefore: |\n  _ < < <O\nafter: |\n  >i < < <O >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_loader_reverse", () => {
    const yamlContent = "name: backwards segment ending in loader\nbefore: |\n  _ < < <O\nafter: |\n  >i < < <O >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_loader_wiggle", () => {
    const yamlContent = "name: backwards segment ending in loader\nbefore: |\n  _ < < <O\nafter: |\n  >i < < <O >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_loader_wiggle_reverse", () => {
    const yamlContent = "name: backwards segment ending in loader\nbefore: |\n  _ < < <O\nafter: |\n  >i < < <O >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_unconnected_loader_1", () => {
    const yamlContent = "name: backwards segment ending in unconnected loader 1\nbefore: |\n  _ < < <I\nafter: |\n  > > >i <I >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_unconnected_loader_1_reverse", () => {
    const yamlContent = "name: backwards segment ending in unconnected loader 1\nbefore: |\n  _ < < <I\nafter: |\n  > > >i <I >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_unconnected_loader_1_wiggle", () => {
    const yamlContent = "name: backwards segment ending in unconnected loader 1\nbefore: |\n  _ < < <I\nafter: |\n  > > >i <I >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_unconnected_loader_1_wiggle_reverse", () => {
    const yamlContent = "name: backwards segment ending in unconnected loader 1\nbefore: |\n  _ < < <I\nafter: |\n  > > >i <I >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_unconnected_loader_2", () => {
    const yamlContent = "name: backwards segment ending in unconnected loader 2\nbefore: |\n  _ < < >O >\nafter: |\n  > > >i >O > >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_unconnected_loader_2_reverse", () => {
    const yamlContent = "name: backwards segment ending in unconnected loader 2\nbefore: |\n  _ < < >O >\nafter: |\n  > > >i >O > >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_unconnected_loader_2_wiggle", () => {
    const yamlContent = "name: backwards segment ending in unconnected loader 2\nbefore: |\n  _ < < >O >\nafter: |\n  > > >i >O > >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_unconnected_loader_2_wiggle_reverse", () => {
    const yamlContent = "name: backwards segment ending in unconnected loader 2\nbefore: |\n  _ < < >O >\nafter: |\n  > > >i >O > >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_unrelated_belt", () => {
    const yamlContent = "name: backwards segment ending in unrelated belt\nbefore: |\n  _ _ _ v\n  _ < < v >\nafter: |\n  _ _ _  v\n  > > >i v >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_unrelated_belt_reverse", () => {
    const yamlContent = "name: backwards segment ending in unrelated belt\nbefore: |\n  _ _ _ v\n  _ < < v >\nafter: |\n  _ _ _  v\n  > > >i v >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_unrelated_belt_wiggle", () => {
    const yamlContent = "name: backwards segment ending in unrelated belt\nbefore: |\n  _ _ _ v\n  _ < < v >\nafter: |\n  _ _ _  v\n  > > >i v >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_segment_ending_in_unrelated_belt_wiggle_reverse", () => {
    const yamlContent = "name: backwards segment ending in unrelated belt\nbefore: |\n  _ _ _ v\n  _ < < v >\nafter: |\n  _ _ _  v\n  > > >i v >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_extension_over_backwards_segment", () => {
    const yamlContent = "name: obstacle extension over backwards segment\nbefore: |\n  _ _ _ _ v\n  _ X _ < <\nafter: |\n  _  _ _ _ v\n  >i X _ < < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_extension_over_backwards_segment_reverse", () => {
    const yamlContent = "name: obstacle extension over backwards segment\nbefore: |\n  _ _ _ _ v\n  _ X _ < <\nafter: |\n  _  _ _ _ v\n  >i X _ < < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_extension_over_backwards_segment_wiggle", () => {
    const yamlContent = "name: obstacle extension over backwards segment\nbefore: |\n  _ _ _ _ v\n  _ X _ < <\nafter: |\n  _  _ _ _ v\n  >i X _ < < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_extension_over_backwards_segment_wiggle_reverse", () => {
    const yamlContent = "name: obstacle extension over backwards segment\nbefore: |\n  _ _ _ _ v\n  _ X _ < <\nafter: |\n  _  _ _ _ v\n  >i X _ < < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_extension2_over_backwards_segment", () => {
    const yamlContent = "name: obstacle extension2 over backwards segment\nbefore: |\n  _ _ _ _ _ v\n  _ X _ X < <\nafter: |\n  _   _ _ _ _ v\n  2>i X _ X < < 2>o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_extension2_over_backwards_segment_reverse", () => {
    const yamlContent = "name: obstacle extension2 over backwards segment\nbefore: |\n  _ _ _ _ _ v\n  _ X _ X < <\nafter: |\n  _   _ _ _ _ v\n  2>i X _ X < < 2>o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_extension2_over_backwards_segment_wiggle", () => {
    const yamlContent = "name: obstacle extension2 over backwards segment\nbefore: |\n  _ _ _ _ _ v\n  _ X _ X < <\nafter: |\n  _   _ _ _ _ v\n  2>i X _ X < < 2>o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_extension2_over_backwards_segment_wiggle_reverse", () => {
    const yamlContent = "name: obstacle extension2 over backwards segment\nbefore: |\n  _ _ _ _ _ v\n  _ X _ X < <\nafter: |\n  _   _ _ _ _ v\n  2>i X _ X < < 2>o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });
});
