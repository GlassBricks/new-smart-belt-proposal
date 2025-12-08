use prototype_abstract::test_case::{DragTestCase, TestVariant, check_test_case_all_transforms};

mod common;

/// Run a single test case from YAML content
pub fn run_test_case(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms(&test_case, false, TestVariant::Normal).unwrap();
}

pub fn run_test_case_reverse(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms(&test_case, true, TestVariant::Normal).unwrap();
}

pub fn run_test_case_wiggle(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms(&test_case, false, TestVariant::Wiggle).unwrap();
}

pub fn run_test_case_wiggle_reverse(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms(&test_case, true, TestVariant::Wiggle).unwrap();
}

pub fn run_test_case_mega_wiggle(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms(&test_case, false, TestVariant::MegaWiggle).unwrap();
}

pub fn run_test_case_mega_wiggle_reverse(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms(&test_case, true, TestVariant::MegaWiggle).unwrap();
}

pub fn run_test_case_forward_back(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms(&test_case, false, TestVariant::ForwardBack).unwrap();
}

pub fn run_test_case_forward_back_reverse(content: &str) {
    common::init_logger();
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case_all_transforms(&test_case, true, TestVariant::ForwardBack).unwrap();
}

// Include the generated test macro calls
include!(concat!(env!("OUT_DIR"), "/generated_tests.rs"));
