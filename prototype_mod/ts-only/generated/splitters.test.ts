// Generated test file for splitters.yaml
import { describe, test, expect } from "bun:test";
import {
  checkTestCaseAllTransforms,
  parseTestCase,
  type DragTestCase,
} from "../test_case";

describe("splitters", () => {

  test("can_integrate_a_splitter", () => {
    const yamlContent = "name: Can integrate a splitter\nbefore: _ >s _\nafter: '> >s >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_integrate_a_splitter_reverse", () => {
    const yamlContent = "name: Can integrate a splitter\nbefore: _ >s _\nafter: '> >s >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_integrate_a_splitter_wiggle", () => {
    const yamlContent = "name: Can integrate a splitter\nbefore: _ >s _\nafter: '> >s >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_integrate_a_splitter_wiggle_reverse", () => {
    const yamlContent = "name: Can integrate a splitter\nbefore: _ >s _\nafter: '> >s >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_integrate_multiple_splitters", () => {
    const yamlContent = "name: Can integrate multiple splitters\nbefore: _ >s >s\nafter: '> >s >s >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_integrate_multiple_splitters_reverse", () => {
    const yamlContent = "name: Can integrate multiple splitters\nbefore: _ >s >s\nafter: '> >s >s >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_integrate_multiple_splitters_wiggle", () => {
    const yamlContent = "name: Can integrate multiple splitters\nbefore: _ >s >s\nafter: '> >s >s >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_integrate_multiple_splitters_wiggle_reverse", () => {
    const yamlContent = "name: Can integrate multiple splitters\nbefore: _ >s >s\nafter: '> >s >s >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("other_direction_splitter_is_obstacle", () => {
    const yamlContent = "name: Other direction splitter is obstacle\nbefore: _ <s _ ^s _ _ vs _\nafter: '>i <s _ ^s >o >i vs >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("other_direction_splitter_is_obstacle_reverse", () => {
    const yamlContent = "name: Other direction splitter is obstacle\nbefore: _ <s _ ^s _ _ vs _\nafter: '>i <s _ ^s >o >i vs >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("other_direction_splitter_is_obstacle_wiggle", () => {
    const yamlContent = "name: Other direction splitter is obstacle\nbefore: _ <s _ ^s _ _ vs _\nafter: '>i <s _ ^s >o >i vs >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("other_direction_splitter_is_obstacle_wiggle_reverse", () => {
    const yamlContent = "name: Other direction splitter is obstacle\nbefore: _ <s _ ^s _ _ vs _\nafter: '>i <s _ ^s >o >i vs >o >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_blocked_entrance_is_not_integrated", () => {
    const yamlContent = "name: Splitter with blocked entrance is not integrated\nbefore: _ X >s\nafter: '>i X >s >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_blocked_entrance_is_not_integrated_reverse", () => {
    const yamlContent = "name: Splitter with blocked entrance is not integrated\nbefore: _ X >s\nafter: '>i X >s >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_blocked_entrance_is_not_integrated_wiggle", () => {
    const yamlContent = "name: Splitter with blocked entrance is not integrated\nbefore: _ X >s\nafter: '>i X >s >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_blocked_entrance_is_not_integrated_wiggle_reverse", () => {
    const yamlContent = "name: Splitter with blocked entrance is not integrated\nbefore: _ X >s\nafter: '>i X >s >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_blocked_entrance_makes_following_belt_segment_unintegrated", () => {
    const yamlContent = "name: Splitter with blocked entrance makes following belt segment unintegrated\nbefore: _ X >s >\nafter: '>i X >s > >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_blocked_entrance_makes_following_belt_segment_unintegrated_reverse", () => {
    const yamlContent = "name: Splitter with blocked entrance makes following belt segment unintegrated\nbefore: _ X >s >\nafter: '>i X >s > >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_blocked_entrance_makes_following_belt_segment_unintegrated_wiggle", () => {
    const yamlContent = "name: Splitter with blocked entrance makes following belt segment unintegrated\nbefore: _ X >s >\nafter: '>i X >s > >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_blocked_entrance_makes_following_belt_segment_unintegrated_wiggle_reverse", () => {
    const yamlContent = "name: Splitter with blocked entrance makes following belt segment unintegrated\nbefore: _ X >s >\nafter: '>i X >s > >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_belt_connected_to_splitter_results_in_obstacle", () => {
    const yamlContent = "name: Backwards belt connected to splitter results in obstacle\nbefore: _ < <s _\nafter: '>i < <s >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_belt_connected_to_splitter_results_in_obstacle_reverse", () => {
    const yamlContent = "name: Backwards belt connected to splitter results in obstacle\nbefore: _ < <s _\nafter: '>i < <s >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_belt_connected_to_splitter_results_in_obstacle_wiggle", () => {
    const yamlContent = "name: Backwards belt connected to splitter results in obstacle\nbefore: _ < <s _\nafter: '>i < <s >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("backwards_belt_connected_to_splitter_results_in_obstacle_wiggle_reverse", () => {
    const yamlContent = "name: Backwards belt connected to splitter results in obstacle\nbefore: _ < <s _\nafter: '>i < <s >o'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_use_splitter_as_underground_output_location", () => {
    const yamlContent = "name: Cannot use splitter as underground output location\nbefore: _ X X X >s > _\nafter: '> X X X >s > *> '\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_use_splitter_as_underground_output_location_reverse", () => {
    const yamlContent = "name: Cannot use splitter as underground output location\nbefore: _ X X X >s > _\nafter: '> X X X >s > *> '\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_use_splitter_as_underground_output_location_wiggle", () => {
    const yamlContent = "name: Cannot use splitter as underground output location\nbefore: _ X X X >s > _\nafter: '> X X X >s > *> '\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("cannot_use_splitter_as_underground_output_location_wiggle_reverse", () => {
    const yamlContent = "name: Cannot use splitter as underground output location\nbefore: _ X X X >s > _\nafter: '> X X X >s > *> '\nexpected_errors:\n  - too_far_to_connect\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_upgrade_a_splitter", () => {
    const yamlContent = "name: Can upgrade a splitter\nbefore: _ 2>s _\nafter: '> >s >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_upgrade_a_splitter_reverse", () => {
    const yamlContent = "name: Can upgrade a splitter\nbefore: _ 2>s _\nafter: '> >s >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_upgrade_a_splitter_wiggle", () => {
    const yamlContent = "name: Can upgrade a splitter\nbefore: _ 2>s _\nafter: '> >s >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("can_upgrade_a_splitter_wiggle_reverse", () => {
    const yamlContent = "name: Can upgrade a splitter\nbefore: _ 2>s _\nafter: '> >s >'\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_curved_belt_after_it_is_not_integrated", () => {
    const yamlContent = "name: Splitter with curved belt after it is not integrated\nbefore: |\n  _  _ _ _  ^\n  _ >s > 2> ^\nafter: |\n  _ _ _ _ ^\n  >i >s > 2> ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_curved_belt_after_it_is_not_integrated_reverse", () => {
    const yamlContent = "name: Splitter with curved belt after it is not integrated\nbefore: |\n  _  _ _ _  ^\n  _ >s > 2> ^\nafter: |\n  _ _ _ _ ^\n  >i >s > 2> ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_curved_belt_after_it_is_not_integrated_wiggle", () => {
    const yamlContent = "name: Splitter with curved belt after it is not integrated\nbefore: |\n  _  _ _ _  ^\n  _ >s > 2> ^\nafter: |\n  _ _ _ _ ^\n  >i >s > 2> ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_curved_belt_after_it_is_not_integrated_wiggle_reverse", () => {
    const yamlContent = "name: Splitter with curved belt after it is not integrated\nbefore: |\n  _  _ _ _  ^\n  _ >s > 2> ^\nafter: |\n  _ _ _ _ ^\n  >i >s > 2> ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_curved_belt_after_is_integrated_if_too_long_to_check", () => {
    const yamlContent = "name: Splitter with curved belt after is integrated if too long to check\nbefore: |\n  _  _  _  _  _  _  _ _ ^\n  _ 2>s 2> 2> 2> 2> > > ^\nafter: |\n  _ _  _ _ _ _ _ _ ^\n  > >s > > > > > > ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_curved_belt_after_is_integrated_if_too_long_to_check_reverse", () => {
    const yamlContent = "name: Splitter with curved belt after is integrated if too long to check\nbefore: |\n  _  _  _  _  _  _  _ _ ^\n  _ 2>s 2> 2> 2> 2> > > ^\nafter: |\n  _ _  _ _ _ _ _ _ ^\n  > >s > > > > > > ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_curved_belt_after_is_integrated_if_too_long_to_check_wiggle", () => {
    const yamlContent = "name: Splitter with curved belt after is integrated if too long to check\nbefore: |\n  _  _  _  _  _  _  _ _ ^\n  _ 2>s 2> 2> 2> 2> > > ^\nafter: |\n  _ _  _ _ _ _ _ _ ^\n  > >s > > > > > > ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_curved_belt_after_is_integrated_if_too_long_to_check_wiggle_reverse", () => {
    const yamlContent = "name: Splitter with curved belt after is integrated if too long to check\nbefore: |\n  _  _  _  _  _  _  _ _ ^\n  _ 2>s 2> 2> 2> 2> > > ^\nafter: |\n  _ _  _ _ _ _ _ _ ^\n  > >s > > > > > > ^\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("double_splitter_with_belt_curved_after_it_is_not_integrated", () => {
    const yamlContent = "name: Double splitter with belt curved after it is not integrated\nbefore: |\n  _ _  _  _ ^\n  _ >s >s > ^\nafter: |\n  _ _  _  _ ^\n  >i >s >s > ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("double_splitter_with_belt_curved_after_it_is_not_integrated_reverse", () => {
    const yamlContent = "name: Double splitter with belt curved after it is not integrated\nbefore: |\n  _ _  _  _ ^\n  _ >s >s > ^\nafter: |\n  _ _  _  _ ^\n  >i >s >s > ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("double_splitter_with_belt_curved_after_it_is_not_integrated_wiggle", () => {
    const yamlContent = "name: Double splitter with belt curved after it is not integrated\nbefore: |\n  _ _  _  _ ^\n  _ >s >s > ^\nafter: |\n  _ _  _  _ ^\n  >i >s >s > ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("double_splitter_with_belt_curved_after_it_is_not_integrated_wiggle_reverse", () => {
    const yamlContent = "name: Double splitter with belt curved after it is not integrated\nbefore: |\n  _ _  _  _ ^\n  _ >s >s > ^\nafter: |\n  _ _  _  _ ^\n  >i >s >s > ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_belt_curved_belt_after_but_belt_input_is_still_integrated", () => {
    const yamlContent = "name: Splitter with belt curved belt after, but belt input is still integrated\nbefore: |\n  _ _ _  _  _ ^\n  _ > >s > 2> ^\nafter: |\n  _ _ _  _ _ ^\n  > > >s > > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_belt_curved_belt_after_but_belt_input_is_still_integrated_reverse", () => {
    const yamlContent = "name: Splitter with belt curved belt after, but belt input is still integrated\nbefore: |\n  _ _ _  _  _ ^\n  _ > >s > 2> ^\nafter: |\n  _ _ _  _ _ ^\n  > > >s > > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_belt_curved_belt_after_but_belt_input_is_still_integrated_wiggle", () => {
    const yamlContent = "name: Splitter with belt curved belt after, but belt input is still integrated\nbefore: |\n  _ _ _  _  _ ^\n  _ > >s > 2> ^\nafter: |\n  _ _ _  _ _ ^\n  > > >s > > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_belt_curved_belt_after_but_belt_input_is_still_integrated_wiggle_reverse", () => {
    const yamlContent = "name: Splitter with belt curved belt after, but belt input is still integrated\nbefore: |\n  _ _ _  _  _ ^\n  _ > >s > 2> ^\nafter: |\n  _ _ _  _ _ ^\n  > > >s > > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_ug_belt_after_it_is_undergrounded_if_we_can_belt_weave", () => {
    const yamlContent = "name: Splitter with ug belt after it is undergrounded if we can belt weave\nbefore: |\n  _  _  _  _ ^\n  _ >s >i >o ^\nafter: |\n  _   _  _  _  ^\n  2>i >s >i >o ^ 2>o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_ug_belt_after_it_is_undergrounded_if_we_can_belt_weave_reverse", () => {
    const yamlContent = "name: Splitter with ug belt after it is undergrounded if we can belt weave\nbefore: |\n  _  _  _  _ ^\n  _ >s >i >o ^\nafter: |\n  _   _  _  _  ^\n  2>i >s >i >o ^ 2>o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_ug_belt_after_it_is_undergrounded_if_we_can_belt_weave_wiggle", () => {
    const yamlContent = "name: Splitter with ug belt after it is undergrounded if we can belt weave\nbefore: |\n  _  _  _  _ ^\n  _ >s >i >o ^\nafter: |\n  _   _  _  _  ^\n  2>i >s >i >o ^ 2>o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_ug_belt_after_it_is_undergrounded_if_we_can_belt_weave_wiggle_reverse", () => {
    const yamlContent = "name: Splitter with ug belt after it is undergrounded if we can belt weave\nbefore: |\n  _  _  _  _ ^\n  _ >s >i >o ^\nafter: |\n  _   _  _  _  ^\n  2>i >s >i >o ^ 2>o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_ug_belt_after_it_is_not_integrated_if_cannot_belt_weave", () => {
    const yamlContent = "name: Splitter with ug belt after it is not integrated if cannot belt weave\nbefore: |\n  _  _  _  _ ^\n  _ >s >i >o ^ X\nafter: |\n  _  _  _  _ ^\n  > >s >i >o ^ *X >\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_ug_belt_after_it_is_not_integrated_if_cannot_belt_weave_reverse", () => {
    const yamlContent = "name: Splitter with ug belt after it is not integrated if cannot belt weave\nbefore: |\n  _  _  _  _ ^\n  _ >s >i >o ^ X\nafter: |\n  _  _  _  _ ^\n  > >s >i >o ^ *X >\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_ug_belt_after_it_is_not_integrated_if_cannot_belt_weave_wiggle", () => {
    const yamlContent = "name: Splitter with ug belt after it is not integrated if cannot belt weave\nbefore: |\n  _  _  _  _ ^\n  _ >s >i >o ^ X\nafter: |\n  _  _  _  _ ^\n  > >s >i >o ^ *X >\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_with_ug_belt_after_it_is_not_integrated_if_cannot_belt_weave_wiggle_reverse", () => {
    const yamlContent = "name: Splitter with ug belt after it is not integrated if cannot belt weave\nbefore: |\n  _  _  _  _ ^\n  _ >s >i >o ^ X\nafter: |\n  _  _  _  _ ^\n  > >s >i >o ^ *X >\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_after_splitter", () => {
    const yamlContent = "name: Splitter after splitter\nbefore: |\n  _  _ _ _ _ _  ^\n  _ >s > > >s > ^\nafter: |\n  _ _  _ _ _   _ ^\n  > >s > > >s  > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_after_splitter_reverse", () => {
    const yamlContent = "name: Splitter after splitter\nbefore: |\n  _  _ _ _ _ _  ^\n  _ >s > > >s > ^\nafter: |\n  _ _  _ _ _   _ ^\n  > >s > > >s  > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_after_splitter_wiggle", () => {
    const yamlContent = "name: Splitter after splitter\nbefore: |\n  _  _ _ _ _ _  ^\n  _ >s > > >s > ^\nafter: |\n  _ _  _ _ _   _ ^\n  > >s > > >s  > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_after_splitter_wiggle_reverse", () => {
    const yamlContent = "name: Splitter after splitter\nbefore: |\n  _  _ _ _ _ _  ^\n  _ >s > > >s > ^\nafter: |\n  _ _  _ _ _   _ ^\n  > >s > > >s  > ^ *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_ending_in_loader_is_integrated", () => {
    const yamlContent = "name: splitter ending in loader is integrated\nbefore: |\n  _ >s > >I\nafter: |\n  > >s > >I\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_ending_in_loader_is_integrated_reverse", () => {
    const yamlContent = "name: splitter ending in loader is integrated\nbefore: |\n  _ >s > >I\nafter: |\n  > >s > >I\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_ending_in_loader_is_integrated_wiggle", () => {
    const yamlContent = "name: splitter ending in loader is integrated\nbefore: |\n  _ >s > >I\nafter: |\n  > >s > >I\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_ending_in_loader_is_integrated_wiggle_reverse", () => {
    const yamlContent = "name: splitter ending in loader is integrated\nbefore: |\n  _ >s > >I\nafter: |\n  > >s > >I\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_segment_ending_in_unrelated_belt_1", () => {
    const yamlContent = "name: Splitter segment ending in unrelated belt 1\nbefore: |\n  _ >s > ^ <\nafter: |\n  > >s >i ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_segment_ending_in_unrelated_belt_1_reverse", () => {
    const yamlContent = "name: Splitter segment ending in unrelated belt 1\nbefore: |\n  _ >s > ^ <\nafter: |\n  > >s >i ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_segment_ending_in_unrelated_belt_1_wiggle", () => {
    const yamlContent = "name: Splitter segment ending in unrelated belt 1\nbefore: |\n  _ >s > ^ <\nafter: |\n  > >s >i ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_segment_ending_in_unrelated_belt_1_wiggle_reverse", () => {
    const yamlContent = "name: Splitter segment ending in unrelated belt 1\nbefore: |\n  _ >s > ^ <\nafter: |\n  > >s >i ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_segment_ending_in_unrelated_belt_2", () => {
    const yamlContent = "name: Splitter segment ending in unrelated belt 2\nbefore: |\n  _ >s > ^i\nafter: |\n  > >s >i ^i >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_segment_ending_in_unrelated_belt_2_reverse", () => {
    const yamlContent = "name: Splitter segment ending in unrelated belt 2\nbefore: |\n  _ >s > ^i\nafter: |\n  > >s >i ^i >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_segment_ending_in_unrelated_belt_2_wiggle", () => {
    const yamlContent = "name: Splitter segment ending in unrelated belt 2\nbefore: |\n  _ >s > ^i\nafter: |\n  > >s >i ^i >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_segment_ending_in_unrelated_belt_2_wiggle_reverse", () => {
    const yamlContent = "name: Splitter segment ending in unrelated belt 2\nbefore: |\n  _ >s > ^i\nafter: |\n  > >s >i ^i >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_segment_ending_in_unrelated_belt_3", () => {
    const yamlContent = "name: Splitter segment ending in unrelated belt 3\nbefore: |\n  _ >s > >i\nafter: |\n  > >s > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_segment_ending_in_unrelated_belt_3_reverse", () => {
    const yamlContent = "name: Splitter segment ending in unrelated belt 3\nbefore: |\n  _ >s > >i\nafter: |\n  > >s > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_segment_ending_in_unrelated_belt_3_wiggle", () => {
    const yamlContent = "name: Splitter segment ending in unrelated belt 3\nbefore: |\n  _ >s > >i\nafter: |\n  > >s > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("splitter_segment_ending_in_unrelated_belt_3_wiggle_reverse", () => {
    const yamlContent = "name: Splitter segment ending in unrelated belt 3\nbefore: |\n  _ >s > >i\nafter: |\n  > >s > >\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_extension_to_over_backwards_segment", () => {
    const yamlContent = "name: obstacle extension to over backwards segment\nbefore: |\n  _ _ _ _  ^\n  _ X _ >s ^\nafter: |\n  _  _ _ _  ^\n  >i X _ >s ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_extension_to_over_backwards_segment_reverse", () => {
    const yamlContent = "name: obstacle extension to over backwards segment\nbefore: |\n  _ _ _ _  ^\n  _ X _ >s ^\nafter: |\n  _  _ _ _  ^\n  >i X _ >s ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_extension_to_over_backwards_segment_wiggle", () => {
    const yamlContent = "name: obstacle extension to over backwards segment\nbefore: |\n  _ _ _ _  ^\n  _ X _ >s ^\nafter: |\n  _  _ _ _  ^\n  >i X _ >s ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("obstacle_extension_to_over_backwards_segment_wiggle_reverse", () => {
    const yamlContent = "name: obstacle extension to over backwards segment\nbefore: |\n  _ _ _ _  ^\n  _ X _ >s ^\nafter: |\n  _  _ _ _  ^\n  >i X _ >s ^ >o\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("curved_input_behind_splitter", () => {
    const yamlContent = "name: curved input behind splitter\nbefore: |\n  _ <s ^ <\nafter: |\n  < <s *^ < <\nexpected_errors:\n  - entity_in_the_way\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("curved_input_behind_splitter_wiggle", () => {
    const yamlContent = "name: curved input behind splitter\nbefore: |\n  _ <s ^ <\nafter: |\n  < <s *^ < <\nexpected_errors:\n  - entity_in_the_way\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("breaking_backwards_splitter_segment", () => {
    const yamlContent = "name: breaking backwards splitter segment\nbefore: |\n  _ < < < < <s\nafter: |\n  > > > > > <s *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("breaking_backwards_splitter_segment_reverse", () => {
    const yamlContent = "name: breaking backwards splitter segment\nbefore: |\n  _ < < < < <s\nafter: |\n  > > > > > <s *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("breaking_backwards_splitter_segment_wiggle", () => {
    const yamlContent = "name: breaking backwards splitter segment\nbefore: |\n  _ < < < < <s\nafter: |\n  > > > > > <s *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("breaking_backwards_splitter_segment_wiggle_reverse", () => {
    const yamlContent = "name: breaking backwards splitter segment\nbefore: |\n  _ < < < < <s\nafter: |\n  > > > > > <s *>\nexpected_errors:\n  - cannot_traverse_past_entity\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, true, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("always_enter_splitter_after_error", () => {
    const yamlContent = "name: always enter splitter after error\nbefore: |\n  _ > ^ 2>s > ^\nafter: |\n  > > ^ *>s > ^\nexpected_errors:\n  - cannot_traverse_past_entity\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, false);
    if (error !== undefined) {
      throw new Error(error);
    }
  });

  test("always_enter_splitter_after_error_wiggle", () => {
    const yamlContent = "name: always enter splitter after error\nbefore: |\n  _ > ^ 2>s > ^\nafter: |\n  > > ^ *>s > ^\nexpected_errors:\n  - cannot_traverse_past_entity\nnot_reversible: true\n";
    const testCase: DragTestCase = parseTestCase(yamlContent);
    const error = checkTestCaseAllTransforms(testCase, false, true);
    if (error !== undefined) {
      throw new Error(error);
    }
  });
});
