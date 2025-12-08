use prototype_abstract::smart_belt::{DragState, DragStateBehavior};
use prototype_abstract::test_case::{DragTestCase, TestVariant, check_test_case_all_transforms};

mod common;

/// Run a single test case from YAML content with a specific state implementation
pub fn run_test_case_with_state<S: DragStateBehavior>(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms::<S>(&test_case, false, TestVariant::Normal).unwrap();
}

pub fn run_test_case_reverse_with_state<S: DragStateBehavior>(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms::<S>(&test_case, true, TestVariant::Normal).unwrap();
}

pub fn run_test_case_wiggle_with_state<S: DragStateBehavior>(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms::<S>(&test_case, false, TestVariant::Wiggle).unwrap();
}

pub fn run_test_case_wiggle_reverse_with_state<S: DragStateBehavior>(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms::<S>(&test_case, true, TestVariant::Wiggle).unwrap();
}

pub fn run_test_case_mega_wiggle_with_state<S: DragStateBehavior>(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms::<S>(&test_case, false, TestVariant::MegaWiggle).unwrap();
}

pub fn run_test_case_mega_wiggle_reverse_with_state<S: DragStateBehavior>(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms::<S>(&test_case, true, TestVariant::MegaWiggle).unwrap();
}

pub fn run_test_case_forward_back_with_state<S: DragStateBehavior>(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms::<S>(&test_case, false, TestVariant::ForwardBack).unwrap();
}

pub fn run_test_case_forward_back_reverse_with_state<S: DragStateBehavior>(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms::<S>(&test_case, true, TestVariant::ForwardBack).unwrap();
}

/// Convenience functions using the default DragState implementation
pub fn run_test_case(content: &str) {
    run_test_case_with_state::<DragState>(content);
}

pub fn run_test_case_reverse(content: &str) {
    run_test_case_reverse_with_state::<DragState>(content);
}

pub fn run_test_case_wiggle(content: &str) {
    run_test_case_wiggle_with_state::<DragState>(content);
}

pub fn run_test_case_wiggle_reverse(content: &str) {
    run_test_case_wiggle_reverse_with_state::<DragState>(content);
}

pub fn run_test_case_mega_wiggle(content: &str) {
    run_test_case_mega_wiggle_with_state::<DragState>(content);
}

pub fn run_test_case_mega_wiggle_reverse(content: &str) {
    run_test_case_mega_wiggle_reverse_with_state::<DragState>(content);
}

pub fn run_test_case_forward_back(content: &str) {
    run_test_case_forward_back_with_state::<DragState>(content);
}

pub fn run_test_case_forward_back_reverse(content: &str) {
    run_test_case_forward_back_reverse_with_state::<DragState>(content);
}

// Include the generated test macro calls
include!(concat!(env!("OUT_DIR"), "/generated_tests.rs"));
