// Generated test file for underground_belts.yaml
import { describe, test, expect } from "bun:test";
import {
  checkTestCaseAllTransforms,
  parseTestCase,
  type DragTestCase,
} from "../test_case";

describe("underground_belts", () => {

  test("underground_belt_obstacle", () => {
    const yamlContent = "name: Underground belt obstacle\nbefore: _ ^i vi ^o vo\nafter: '>i ^i vi ^o vo >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("underground_belt_obstacle_reverse", () => {
    const yamlContent = "name: Underground belt obstacle\nbefore: _ ^i vi ^o vo\nafter: '>i ^i vi ^o vo >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("underground_belt_obstacle_wiggle", () => {
    const yamlContent = "name: Underground belt obstacle\nbefore: _ ^i vi ^o vo\nafter: '>i ^i vi ^o vo >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("underground_belt_obstacle_wiggle_reverse", () => {
    const yamlContent = "name: Underground belt obstacle\nbefore: _ ^i vi ^o vo\nafter: '>i ^i vi ^o vo >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unpaired_underground_is_replaced", () => {
    const yamlContent = "name: Unpaired underground is replaced\nbefore: _ >o >i 2<i 2<o\nafter: '> > > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unpaired_underground_is_replaced_reverse", () => {
    const yamlContent = "name: Unpaired underground is replaced\nbefore: _ >o >i 2<i 2<o\nafter: '> > > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unpaired_underground_is_replaced_wiggle", () => {
    const yamlContent = "name: Unpaired underground is replaced\nbefore: _ >o >i 2<i 2<o\nafter: '> > > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unpaired_underground_is_replaced_wiggle_reverse", () => {
    const yamlContent = "name: Unpaired underground is replaced\nbefore: _ >o >i 2<i 2<o\nafter: '> > > > > > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unpaired_underground_after_obstacle_is_replaced", () => {
    const yamlContent = "name: Unpaired underground after obstacle is replaced\nbefore: _ _ X X >o\nafter: '> >i X X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unpaired_underground_after_obstacle_is_replaced_reverse", () => {
    const yamlContent = "name: Unpaired underground after obstacle is replaced\nbefore: _ _ X X >o\nafter: '> >i X X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unpaired_underground_after_obstacle_is_replaced_wiggle", () => {
    const yamlContent = "name: Unpaired underground after obstacle is replaced\nbefore: _ _ X X >o\nafter: '> >i X X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unpaired_underground_after_obstacle_is_replaced_wiggle_reverse", () => {
    const yamlContent = "name: Unpaired underground after obstacle is replaced\nbefore: _ _ X X >o\nafter: '> >i X X >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("passing_through_existing_underground", () => {
    const yamlContent = "name: Passing through existing underground\nbefore: |\n  _ _ _ _  ^\n  _ _ >i X ^ > X >o _\nafter: |\n  _ _ _ _  ^\n  > > >i X ^ > X >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("passing_through_existing_underground_reverse", () => {
    const yamlContent = "name: Passing through existing underground\nbefore: |\n  _ _ _ _  ^\n  _ _ >i X ^ > X >o _\nafter: |\n  _ _ _ _  ^\n  > > >i X ^ > X >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("passing_through_existing_underground_wiggle", () => {
    const yamlContent = "name: Passing through existing underground\nbefore: |\n  _ _ _ _  ^\n  _ _ >i X ^ > X >o _\nafter: |\n  _ _ _ _  ^\n  > > >i X ^ > X >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("passing_through_existing_underground_wiggle_reverse", () => {
    const yamlContent = "name: Passing through existing underground\nbefore: |\n  _ _ _ _  ^\n  _ _ >i X ^ > X >o _\nafter: |\n  _ _ _ _  ^\n  > > >i X ^ > X >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("flipping_existing_underground", () => {
    const yamlContent = "name: Flipping existing underground\nbefore: _ _ <o <i > >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("flipping_existing_underground_reverse", () => {
    const yamlContent = "name: Flipping existing underground\nbefore: _ _ <o <i > >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("flipping_existing_underground_wiggle", () => {
    const yamlContent = "name: Flipping existing underground\nbefore: _ _ <o <i > >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("flipping_existing_underground_wiggle_reverse", () => {
    const yamlContent = "name: Flipping existing underground\nbefore: _ _ <o <i > >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_after_underground_is_error", () => {
    const yamlContent = "name: Obstacle after underground is error\nbefore: _ >i >o X X\nafter: '> >i >o *X X'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_after_underground_is_error_reverse", () => {
    const yamlContent = "name: Obstacle after underground is error\nbefore: _ >i >o X X\nafter: '> >i >o *X X'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_after_underground_is_error_wiggle", () => {
    const yamlContent = "name: Obstacle after underground is error\nbefore: _ >i >o X X\nafter: '> >i >o *X X'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_after_underground_is_error_wiggle_reverse", () => {
    const yamlContent = "name: Obstacle after underground is error\nbefore: _ >i >o X X\nafter: '> >i >o *X X'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("error_recovery", () => {
    const yamlContent = "name: Error recovery\nbefore: _ >i >o X X X X X X X X X X\nafter: '> >i >o *X X X X X X X X X X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("error_recovery_reverse", () => {
    const yamlContent = "name: Error recovery\nbefore: _ >i >o X X X X X X X X X X\nafter: '> >i >o *X X X X X X X X X X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("error_recovery_wiggle", () => {
    const yamlContent = "name: Error recovery\nbefore: _ >i >o X X X X X X X X X X\nafter: '> >i >o *X X X X X X X X X X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("error_recovery_wiggle_reverse", () => {
    const yamlContent = "name: Error recovery\nbefore: _ >i >o X X X X X X X X X X\nafter: '> >i >o *X X X X X X X X X X >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("curved_belt_after_underground", () => {
    const yamlContent = "name: Curved belt after underground\nbefore: |\n  _ _ _ _   ^\n  _ _ >i >o ^\nafter: |\n  _ _ _ _   ^\n  > > >i >o ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("curved_belt_after_underground_reverse", () => {
    const yamlContent = "name: Curved belt after underground\nbefore: |\n  _ _ _ _   ^\n  _ _ >i >o ^\nafter: |\n  _ _ _ _   ^\n  > > >i >o ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("curved_belt_after_underground_wiggle", () => {
    const yamlContent = "name: Curved belt after underground\nbefore: |\n  _ _ _ _   ^\n  _ _ >i >o ^\nafter: |\n  _ _ _ _   ^\n  > > >i >o ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("curved_belt_after_underground_wiggle_reverse", () => {
    const yamlContent = "name: Curved belt after underground\nbefore: |\n  _ _ _ _   ^\n  _ _ >i >o ^\nafter: |\n  _ _ _ _   ^\n  > > >i >o ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_flip_belt_after_underground", () => {
    const yamlContent = "name: Can flip belt after underground\nbefore: _ _ >i >o < >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_flip_belt_after_underground_reverse", () => {
    const yamlContent = "name: Can flip belt after underground\nbefore: _ _ >i >o < >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_flip_belt_after_underground_wiggle", () => {
    const yamlContent = "name: Can flip belt after underground\nbefore: _ _ >i >o < >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_flip_belt_after_underground_wiggle_reverse", () => {
    const yamlContent = "name: Can flip belt after underground\nbefore: _ _ >i >o < >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_integrate_belt_after_underground", () => {
    const yamlContent = "name: Can integrate belt after underground\nbefore: _ _ >i >o >o >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_integrate_belt_after_underground_reverse", () => {
    const yamlContent = "name: Can integrate belt after underground\nbefore: _ _ >i >o >o >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_integrate_belt_after_underground_wiggle", () => {
    const yamlContent = "name: Can integrate belt after underground\nbefore: _ _ >i >o >o >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_integrate_belt_after_underground_wiggle_reverse", () => {
    const yamlContent = "name: Can integrate belt after underground\nbefore: _ _ >i >o >o >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("running_into_the_back_of_a_paired_underground_is_an_obstacle", () => {
    const yamlContent = "name: running into the back of a paired underground is an obstacle\nbefore: 2>i *_ _ 2>o >\nafter: 2>i > >i 2>o > >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("running_into_the_back_of_a_paired_underground_is_an_obstacle_reverse", () => {
    const yamlContent = "name: running into the back of a paired underground is an obstacle\nbefore: 2>i *_ _ 2>o >\nafter: 2>i > >i 2>o > >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("running_into_the_back_of_a_paired_underground_is_an_obstacle_wiggle", () => {
    const yamlContent = "name: running into the back of a paired underground is an obstacle\nbefore: 2>i *_ _ 2>o >\nafter: 2>i > >i 2>o > >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("running_into_the_back_of_a_paired_underground_is_an_obstacle_wiggle_reverse", () => {
    const yamlContent = "name: running into the back of a paired underground is an obstacle\nbefore: 2>i *_ _ 2>o >\nafter: 2>i > >i 2>o > >o >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("upgrading_existing_underground", () => {
    const yamlContent = "name: Upgrading existing underground\nbefore: _ _ 2<o 2<i > >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("upgrading_existing_underground_reverse", () => {
    const yamlContent = "name: Upgrading existing underground\nbefore: _ _ 2<o 2<i > >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("upgrading_existing_underground_wiggle", () => {
    const yamlContent = "name: Upgrading existing underground\nbefore: _ _ 2<o 2<i > >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("upgrading_existing_underground_wiggle_reverse", () => {
    const yamlContent = "name: Upgrading existing underground\nbefore: _ _ 2<o 2<i > >\nafter: '> > >i >o > >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_too_making_too_short", () => {
    const yamlContent = "name: Cannot upgrade due to too making too short\nbefore: _ 2<o _ _ _ _ _ 2<i _\nafter: '> *2>i _ _ _ _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_too_making_too_short_reverse", () => {
    const yamlContent = "name: Cannot upgrade due to too making too short\nbefore: _ 2<o _ _ _ _ _ 2<i _\nafter: '> *2>i _ _ _ _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_too_making_too_short_wiggle", () => {
    const yamlContent = "name: Cannot upgrade due to too making too short\nbefore: _ 2<o _ _ _ _ _ 2<i _\nafter: '> *2>i _ _ _ _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_too_making_too_short_wiggle_reverse", () => {
    const yamlContent = "name: Cannot upgrade due to too making too short\nbefore: _ 2<o _ _ _ _ _ 2<i _\nafter: '> *2>i _ _ _ _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_1", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 1\nbefore: _ 2<o _ >o _ _ 2<i _\nafter: '> *2>i _ >o _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_1_reverse", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 1\nbefore: _ 2<o _ >o _ _ 2<i _\nafter: '> *2>i _ >o _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_1_wiggle", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 1\nbefore: _ 2<o _ >o _ _ 2<i _\nafter: '> *2>i _ >o _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_1_wiggle_reverse", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 1\nbefore: _ 2<o _ >o _ _ 2<i _\nafter: '> *2>i _ >o _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_2", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 2\nbefore: _ 2<o _ >i _ _ 2<i _\nafter: '> *2>i _ >i _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_2_reverse", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 2\nbefore: _ 2<o _ >i _ _ 2<i _\nafter: '> *2>i _ >i _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_2_wiggle", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 2\nbefore: _ 2<o _ >i _ _ 2<i _\nafter: '> *2>i _ >i _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_2_wiggle_reverse", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 2\nbefore: _ 2<o _ >i _ _ 2<i _\nafter: '> *2>i _ >i _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_3", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 3\nbefore: _ 2<o _ <o _ _ 2<i _\nafter: '> *2>i _ <o _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_3_reverse", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 3\nbefore: _ 2<o _ <o _ _ 2<i _\nafter: '> *2>i _ <o _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_3_wiggle", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 3\nbefore: _ 2<o _ <o _ _ 2<i _\nafter: '> *2>i _ <o _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_3_wiggle_reverse", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 3\nbefore: _ 2<o _ <o _ _ 2<i _\nafter: '> *2>i _ <o _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_4", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 4\nbefore: _ 2<o _ <i _ _ 2<i _\nafter: '> *2>i _ <i _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_4_reverse", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 4\nbefore: _ 2<o _ <i _ _ 2<i _\nafter: '> *2>i _ <i _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_4_wiggle", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 4\nbefore: _ 2<o _ <i _ _ 2<i _\nafter: '> *2>i _ <i _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_upgrade_due_to_intercepting_underground_4_wiggle_reverse", () => {
    const yamlContent = "name: Cannot upgrade due to intercepting underground 4\nbefore: _ 2<o _ <i _ _ 2<i _\nafter: '> *2>i _ <i _ _ 2>o >'\nexpected_errors:\n  - cannot_upgrade_underground\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("still_can_upgrade_if_another_tier", () => {
    const yamlContent = "name: Still can upgrade if another tier\nbefore: _ 2<o _ 3<i _ _ 2<i _\nafter: '> >i _ 3<i _ _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("still_can_upgrade_if_another_tier_reverse", () => {
    const yamlContent = "name: Still can upgrade if another tier\nbefore: _ 2<o _ 3<i _ _ 2<i _\nafter: '> >i _ 3<i _ _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("still_can_upgrade_if_another_tier_wiggle", () => {
    const yamlContent = "name: Still can upgrade if another tier\nbefore: _ 2<o _ 3<i _ _ 2<i _\nafter: '> >i _ 3<i _ _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("still_can_upgrade_if_another_tier_wiggle_reverse", () => {
    const yamlContent = "name: Still can upgrade if another tier\nbefore: _ 2<o _ 3<i _ _ 2<i _\nafter: '> >i _ 3<i _ _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("still_can_upgrade_if_wrong_direction", () => {
    const yamlContent = "name: Still can upgrade if wrong direction\nbefore: _ 2<o _ ^i _ _ 2<i _\nafter: '> >i _ ^i _ _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("still_can_upgrade_if_wrong_direction_reverse", () => {
    const yamlContent = "name: Still can upgrade if wrong direction\nbefore: _ 2<o _ ^i _ _ 2<i _\nafter: '> >i _ ^i _ _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("still_can_upgrade_if_wrong_direction_wiggle", () => {
    const yamlContent = "name: Still can upgrade if wrong direction\nbefore: _ 2<o _ ^i _ _ 2<i _\nafter: '> >i _ ^i _ _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("still_can_upgrade_if_wrong_direction_wiggle_reverse", () => {
    const yamlContent = "name: Still can upgrade if wrong direction\nbefore: _ 2<o _ ^i _ _ 2<i _\nafter: '> >i _ ^i _ _ >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_upgrade_underground_after_curved_belt_failure", () => {
    const yamlContent = "name: Can upgrade underground after curved belt failure\nbefore: |\n  _ _ ^\n  _ > ^ 2>i _ 2>o\nafter: |\n  _ _ ^\n  > > ^ *>i _ >o\nexpected_errors:\n  - cannot_traverse_past_entity\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_upgrade_underground_after_curved_belt_failure_wiggle", () => {
    const yamlContent = "name: Can upgrade underground after curved belt failure\nbefore: |\n  _ _ ^\n  _ > ^ 2>i _ 2>o\nafter: |\n  _ _ ^\n  > > ^ *>i _ >o\nexpected_errors:\n  - cannot_traverse_past_entity\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_upgrade_underground_after_curved_belt_reverse", () => {
    const yamlContent = "name: Can upgrade underground after curved belt reverse\nbefore: |\n  _ _ v\n  _ < < 2>i _ 2>o\nafter: |\n  _ _ v\n  < < < *<o _ <i\nexpected_errors:\n  - cannot_traverse_past_entity\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_upgrade_underground_after_curved_belt_reverse_wiggle", () => {
    const yamlContent = "name: Can upgrade underground after curved belt reverse\nbefore: |\n  _ _ v\n  _ < < 2>i _ 2>o\nafter: |\n  _ _ v\n  < < < *<o _ <i\nexpected_errors:\n  - cannot_traverse_past_entity\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_upgrade_underground_after_blocked_output_failure", () => {
    const yamlContent = "name: Can upgrade underground after blocked output failure\nbefore: _ >i >o X X X 2<o 2<i\nafter: '> >i >o *X X X >i >o >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_upgrade_underground_after_blocked_output_failure_reverse", () => {
    const yamlContent = "name: Can upgrade underground after blocked output failure\nbefore: _ >i >o X X X 2<o 2<i\nafter: '> >i >o *X X X >i >o >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_upgrade_underground_after_blocked_output_failure_wiggle", () => {
    const yamlContent = "name: Can upgrade underground after blocked output failure\nbefore: _ >i >o X X X 2<o 2<i\nafter: '> >i >o *X X X >i >o >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_upgrade_underground_after_blocked_output_failure_wiggle_reverse", () => {
    const yamlContent = "name: Can upgrade underground after blocked output failure\nbefore: _ >i >o X X X 2<o 2<i\nafter: '> >i >o *X X X >i >o >'\nexpected_errors:\n  - entity_in_the_way\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("multiple_errors", () => {
    const yamlContent = "name: Multiple errors\nbefore: |\n  _ _ ^\n  _ > ^ 2>i >o 2>o\nafter: |\n  _ _ ^\n  > > ^ **2>i >o 2>o\nexpected_errors:\n  - cannot_traverse_past_entity\n  - cannot_upgrade_underground\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("multiple_errors_wiggle", () => {
    const yamlContent = "name: Multiple errors\nbefore: |\n  _ _ ^\n  _ > ^ 2>i >o 2>o\nafter: |\n  _ _ ^\n  > > ^ **2>i >o 2>o\nexpected_errors:\n  - cannot_traverse_past_entity\n  - cannot_upgrade_underground\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unenterable_underground_of_different_tier_is_obstacle", () => {
    const yamlContent = "name: unenterable underground of different tier is obstacle\nbefore: _ X 2>i _ _ 2>o\nafter: '>i X 2>i >o >i 2>o >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unenterable_underground_of_different_tier_is_obstacle_reverse", () => {
    const yamlContent = "name: unenterable underground of different tier is obstacle\nbefore: _ X 2>i _ _ 2>o\nafter: '>i X 2>i >o >i 2>o >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unenterable_underground_of_different_tier_is_obstacle_wiggle", () => {
    const yamlContent = "name: unenterable underground of different tier is obstacle\nbefore: _ X 2>i _ _ 2>o\nafter: '>i X 2>i >o >i 2>o >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unenterable_underground_of_different_tier_is_obstacle_wiggle_reverse", () => {
    const yamlContent = "name: unenterable underground of different tier is obstacle\nbefore: _ X 2>i _ _ 2>o\nafter: '>i X 2>i >o >i 2>o >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unenterable_underground_of_same_tier_is_impassable", () => {
    const yamlContent = "name: unenterable underground of same tier is impassable\nbefore: _ X >i >o _\nafter: '> X >i >o *>'\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unenterable_underground_of_same_tier_is_impassable_reverse", () => {
    const yamlContent = "name: unenterable underground of same tier is impassable\nbefore: _ X >i >o _\nafter: '> X >i >o *>'\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unenterable_underground_of_same_tier_is_impassable_wiggle", () => {
    const yamlContent = "name: unenterable underground of same tier is impassable\nbefore: _ X >i >o _\nafter: '> X >i >o *>'\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("unenterable_underground_of_same_tier_is_impassable_wiggle_reverse", () => {
    const yamlContent = "name: unenterable underground of same tier is impassable\nbefore: _ X >i >o _\nafter: '> X >i >o *>'\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_paired_underground_of_different_tier_is_obstacle", () => {
    const yamlContent = "name: backwards paired underground of different tier is obstacle\nbefore: 2<o *_ 2<i < <\nafter: 2<o >i 2<i < < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_paired_underground_of_different_tier_is_obstacle_reverse", () => {
    const yamlContent = "name: backwards paired underground of different tier is obstacle\nbefore: 2<o *_ 2<i < <\nafter: 2<o >i 2<i < < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_paired_underground_of_different_tier_is_obstacle_wiggle", () => {
    const yamlContent = "name: backwards paired underground of different tier is obstacle\nbefore: 2<o *_ 2<i < <\nafter: 2<o >i 2<i < < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_paired_underground_of_different_tier_is_obstacle_wiggle_reverse", () => {
    const yamlContent = "name: backwards paired underground of different tier is obstacle\nbefore: 2<o *_ 2<i < <\nafter: 2<o >i 2<i < < >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_paired_underground_of_same_tier_is_impassable_and_doesn_t_override_later_belt", () => {
    const yamlContent = "name: >-\n  backwards paired underground of same tier is impassable, and doesn't override\n  later belt\nbefore: <o *_ <i < <\nafter: <o > <i < < *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_paired_underground_of_same_tier_is_impassable_and_doesn_t_override_later_belt_reverse", () => {
    const yamlContent = "name: >-\n  backwards paired underground of same tier is impassable, and doesn't override\n  later belt\nbefore: <o *_ <i < <\nafter: <o > <i < < *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_paired_underground_of_same_tier_is_impassable_and_doesn_t_override_later_belt_wiggle", () => {
    const yamlContent = "name: >-\n  backwards paired underground of same tier is impassable, and doesn't override\n  later belt\nbefore: <o *_ <i < <\nafter: <o > <i < < *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_paired_underground_of_same_tier_is_impassable_and_doesn_t_override_later_belt_wiggle_reverse", () => {
    const yamlContent = "name: >-\n  backwards paired underground of same tier is impassable, and doesn't override\n  later belt\nbefore: <o *_ <i < <\nafter: <o > <i < < *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });
});
