// Generated test file for basic_tests.yaml
import { describe, test, expect } from "bun:test";
import {
  checkTestCaseAllTransforms,
  parseTestCase,
  type DragTestCase,
} from "../test_case";

describe("basic_tests", () => {

  test("empty_world", () => {
    const yamlContent = "name: Empty world\nbefore: ''\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("empty_world_reverse", () => {
    const yamlContent = "name: Empty world\nbefore: ''\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("empty_world_wiggle", () => {
    const yamlContent = "name: Empty world\nbefore: ''\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("empty_world_wiggle_reverse", () => {
    const yamlContent = "name: Empty world\nbefore: ''\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("overlapping_exisiting_belt", () => {
    const yamlContent = "name: Overlapping exisiting belt\nbefore: _ > >\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("overlapping_exisiting_belt_reverse", () => {
    const yamlContent = "name: Overlapping exisiting belt\nbefore: _ > >\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("overlapping_exisiting_belt_wiggle", () => {
    const yamlContent = "name: Overlapping exisiting belt\nbefore: _ > >\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("overlapping_exisiting_belt_wiggle_reverse", () => {
    const yamlContent = "name: Overlapping exisiting belt\nbefore: _ > >\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("overlapping_backwards_belt", () => {
    const yamlContent = "name: Overlapping backwards belt\nbefore: _ < <\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("overlapping_backwards_belt_reverse", () => {
    const yamlContent = "name: Overlapping backwards belt\nbefore: _ < <\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("overlapping_backwards_belt_wiggle", () => {
    const yamlContent = "name: Overlapping backwards belt\nbefore: _ < <\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("overlapping_backwards_belt_wiggle_reverse", () => {
    const yamlContent = "name: Overlapping backwards belt\nbefore: _ < <\nafter: '> > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("simple_obstacle", () => {
    const yamlContent = "name: Simple obstacle\nbefore: _ _ X\nafter: '> >i X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("simple_obstacle_reverse", () => {
    const yamlContent = "name: Simple obstacle\nbefore: _ _ X\nafter: '> >i X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("simple_obstacle_wiggle", () => {
    const yamlContent = "name: Simple obstacle\nbefore: _ _ X\nafter: '> >i X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("simple_obstacle_wiggle_reverse", () => {
    const yamlContent = "name: Simple obstacle\nbefore: _ _ X\nafter: '> >i X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("simple_obstacle_2", () => {
    const yamlContent = "name: Simple obstacle 2\nbefore: _ _ X X\nafter: '> >i X X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("simple_obstacle_2_reverse", () => {
    const yamlContent = "name: Simple obstacle 2\nbefore: _ _ X X\nafter: '> >i X X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("simple_obstacle_2_wiggle", () => {
    const yamlContent = "name: Simple obstacle 2\nbefore: _ _ X X\nafter: '> >i X X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("simple_obstacle_2_wiggle_reverse", () => {
    const yamlContent = "name: Simple obstacle 2\nbefore: _ _ X X\nafter: '> >i X X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_too_long", () => {
    const yamlContent = "name: Obstacle too long\nbefore: _ _ X X X X X\nafter: '> > X X X X X *> >'\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_too_long_reverse", () => {
    const yamlContent = "name: Obstacle too long\nbefore: _ _ X X X X X\nafter: '> > X X X X X *> >'\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_too_long_wiggle", () => {
    const yamlContent = "name: Obstacle too long\nbefore: _ _ X X X X X\nafter: '> > X X X X X *> >'\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_too_long_wiggle_reverse", () => {
    const yamlContent = "name: Obstacle too long\nbefore: _ _ X X X X X\nafter: '> > X X X X X *> >'\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("underground_extension", () => {
    const yamlContent = "name: Underground extension\nbefore: _ _ X X _ X\nafter: '> >i X X _ X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("underground_extension_reverse", () => {
    const yamlContent = "name: Underground extension\nbefore: _ _ X X _ X\nafter: '> >i X X _ X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("underground_extension_wiggle", () => {
    const yamlContent = "name: Underground extension\nbefore: _ _ X X _ X\nafter: '> >i X X _ X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("underground_extension_wiggle_reverse", () => {
    const yamlContent = "name: Underground extension\nbefore: _ _ X X _ X\nafter: '> >i X X _ X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("no_extension", () => {
    const yamlContent = "name: No extension\nbefore: _ _ X _ _ X\nafter: '> >i X >o >i X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("no_extension_reverse", () => {
    const yamlContent = "name: No extension\nbefore: _ _ X _ _ X\nafter: '> >i X >o >i X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("no_extension_wiggle", () => {
    const yamlContent = "name: No extension\nbefore: _ _ X _ _ X\nafter: '> >i X >o >i X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("no_extension_wiggle_reverse", () => {
    const yamlContent = "name: No extension\nbefore: _ _ X _ _ X\nafter: '> >i X >o >i X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("extension_then_too_long", () => {
    const yamlContent = "name: Extension, then too long\nbefore: _ _ X X _ X X\nafter: '> >i X X >o X X *> >'\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("extension_then_too_long_reverse", () => {
    const yamlContent = "name: Extension, then too long\nbefore: _ _ X X _ X X\nafter: '> >i X X >o X X *> >'\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("extension_then_too_long_wiggle", () => {
    const yamlContent = "name: Extension, then too long\nbefore: _ _ X X _ X X\nafter: '> >i X X >o X X *> >'\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("extension_then_too_long_wiggle_reverse", () => {
    const yamlContent = "name: Extension, then too long\nbefore: _ _ X X _ X X\nafter: '> >i X X >o X X *> >'\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("blocked_at_start", () => {
    const yamlContent = "name: Blocked at start\nbefore: X\nafter: '*X > >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("blocked_at_start_reverse", () => {
    const yamlContent = "name: Blocked at start\nbefore: X\nafter: '*X > >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("blocked_at_start_wiggle", () => {
    const yamlContent = "name: Blocked at start\nbefore: X\nafter: '*X > >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("blocked_at_start_wiggle_reverse", () => {
    const yamlContent = "name: Blocked at start\nbefore: X\nafter: '*X > >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("more_blocked_at_start", () => {
    const yamlContent = "name: More blocked at start\nbefore: X X X X\nafter: '*X X X X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("more_blocked_at_start_reverse", () => {
    const yamlContent = "name: More blocked at start\nbefore: X X X X\nafter: '*X X X X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("more_blocked_at_start_wiggle", () => {
    const yamlContent = "name: More blocked at start\nbefore: X X X X\nafter: '*X X X X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("more_blocked_at_start_wiggle_reverse", () => {
    const yamlContent = "name: More blocked at start\nbefore: X X X X\nafter: '*X X X X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });
});
