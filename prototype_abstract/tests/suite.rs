use protoype_abstract::test_case::{DragTestCase, check_test_case};

fn check_test_case_from_str(content: &str) {
    let test_case: DragTestCase =
        serde_yaml::from_str(content).expect("Failed to parse test case YAML");

    check_test_case(&test_case).unwrap();
}

macro_rules! test_drag {
    ($test_name:ident, $yaml_content:expr) => {
        #[test]
        fn $test_name() {
            check_test_case_from_str($yaml_content);
        }
    };
}

// Include the generated test macro calls
include!(concat!(env!("OUT_DIR"), "/generated_tests.rs"));
