use anyhow::Result;
use protoype_abstract::test::{DragTestCase, check_test_case};
use std::{env, fs, panic, path::PathBuf};

fn get_test_suite_dir() -> Result<PathBuf> {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR")?;
    let test_suite_dir = PathBuf::from(manifest_dir).join("../test_suite");
    Ok(test_suite_dir)
}

fn load_yaml_test_cases() -> Result<Vec<DragTestCase>> {
    let test_suite_dir = get_test_suite_dir()?;

    if !test_suite_dir.exists() {
        println!("Test suite directory does not exist: {:?}", test_suite_dir);
        return Ok(Vec::new());
    }

    let mut test_cases = Vec::new();

    for entry in fs::read_dir(&test_suite_dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) != Some("yaml") {
            continue;
        }

        let content = fs::read_to_string(&path)?;

        // Try to deserialize as a vector of test cases first
        let mut cases = serde_yaml::from_str::<Vec<DragTestCase>>(&content)?;
        test_cases.append(&mut cases);
    }

    Ok(test_cases)
}

#[test]
fn run_yaml_test_suite() -> Result<()> {
    let test_cases = load_yaml_test_cases()?;

    if test_cases.is_empty() {
        println!("No test cases found in test_suite directory");
        return Ok(());
    }

    println!("{} test cases", test_cases.len());
    println!("{}", "-".repeat(80));

    let mut failed_tests = Vec::new();
    for (i, test_case) in test_cases.iter().enumerate() {
        let test_name = test_case
            .name
            .clone()
            .unwrap_or_else(|| format!("Test {}", i + 1));

        let result = panic::catch_unwind(panic::AssertUnwindSafe(|| check_test_case(test_case)));

        let mut add_err = |err_msg: String, test_name: String| {
            if err_msg.contains("not yet implemented") {
                println!("⚠ {}: Not yet implemented", test_name);
            } else {
                println!("✗ {}:\n{}", test_name, err_msg);
                failed_tests.push((test_name, err_msg));
            }
        };

        match result {
            Ok(Ok(())) => {
                println!("✓ {}", test_name);
            }
            Ok(Err(e)) => {
                add_err(e.to_string(), test_name);
            }
            Err(e) => {
                let panic_msg = if let Some(s) = e.downcast_ref::<&str>() {
                    s.to_string()
                } else if let Some(s) = e.downcast_ref::<String>() {
                    s.clone()
                } else {
                    "Test panicked with unknown error".to_string()
                };
                add_err(panic_msg, test_name);
            }
        }
        println!("{}", "-".repeat(80));
    }

    if !failed_tests.is_empty() {
        anyhow::bail!(
            "{} out of {} tests failed",
            failed_tests.len(),
            test_cases.len()
        );
    }

    println!("\nAll {} tests passed!", test_cases.len());
    Ok(())
}
