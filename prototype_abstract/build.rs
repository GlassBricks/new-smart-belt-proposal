use serde::Deserialize;
use std::env;
use std::fs;
use std::path::PathBuf;

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
struct TestCaseFlags {
    #[serde(default)]
    not_reversible: bool,
    #[serde(default)]
    forward_back: bool,
}

fn main() {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    let test_suite_dir = PathBuf::from(&manifest_dir).join("../test_suite");
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = PathBuf::from(&out_dir).join("generated_tests.rs");

    // Tell cargo to rerun if test_suite directory changes
    println!("cargo:rerun-if-changed=../test_suite");
    if test_suite_dir.exists() {
        for entry in fs::read_dir(&test_suite_dir).unwrap() {
            let entry = entry.unwrap();
            println!("cargo:rerun-if-changed={}", entry.path().display());
        }
    }

    let mut generated_code = String::new();

    if !test_suite_dir.exists() {
        // Generate empty file if test suite doesn't exist
        fs::write(&dest_path, "// No test suite directory found\n").unwrap();
        return;
    }
    for entry in fs::read_dir(&test_suite_dir).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) != Some("yaml") {
            continue;
        }

        let content = fs::read_to_string(&path).unwrap();
        let file_stem = path.file_stem().unwrap().to_str().unwrap();

        generated_code.push_str(&format!("mod {} {{\n", file_stem));

        // Parse YAML to get test cases and generate macro calls
        let test_cases = serde_yaml::from_str::<Vec<serde_yaml::Value>>(&content).unwrap();
        for (i, test_case) in test_cases.iter().enumerate() {
            let test_name = if let Some(name) = test_case.get("name").and_then(|v| v.as_str()) {
                let sanitized_name =
                    name.to_lowercase()
                        .chars()
                        .fold(String::new(), |mut acc, c| {
                            if c.is_alphanumeric() {
                                acc.push(c);
                            } else if !acc.ends_with('_') {
                                acc.push('_');
                            }
                            acc
                        });
                sanitized_name.trim_end_matches('_').to_string()
            } else {
                format!("{:03}", i + 1)
            };

            let yaml_content = serde_yaml::to_string(&test_case).unwrap();

            // Parse flags to determine which variants to generate
            let flags: TestCaseFlags =
                serde_yaml::from_value(test_case.clone()).unwrap_or(TestCaseFlags {
                    not_reversible: false,
                    forward_back: false,
                });

            // Build list of test variants to generate based on flags
            let mut test_fns = vec![];

            if flags.forward_back {
                // For forward_back tests, generate ForwardBack variants
                test_fns.push(("run_test_case_forward_back", ""));
                if !flags.not_reversible {
                    test_fns.push(("run_test_case_forward_back_reverse", "_reverse"));
                }
            } else {
                // For normal tests, generate normal and wiggle variants
                test_fns.push(("run_test_case", ""));
                if !flags.not_reversible {
                    test_fns.push(("run_test_case_reverse", "_reverse"));
                }
                test_fns.push(("run_test_case_wiggle", "_wiggle"));
                test_fns.push(("run_test_case_mega_wiggle", "_mega_wiggle"));
                if !flags.not_reversible {
                    test_fns.push(("run_test_case_wiggle_reverse", "_wiggle_reverse"));
                    test_fns.push(("run_test_case_mega_wiggle_reverse", "_mega_wiggle_reverse"));
                }
            }

            for (fn_name, suffix) in test_fns {
                generated_code.push_str(&format!(
                    r##"
    #[test]
    fn test_{test_name}{suffix}() {{
        crate::{fn_name}(r#"{0}"#);
    }}
"##,
                    yaml_content.trim()
                ));
            }
        }

        generated_code.push_str("}\n");
    }

    fs::write(&dest_path, generated_code).unwrap();
}
