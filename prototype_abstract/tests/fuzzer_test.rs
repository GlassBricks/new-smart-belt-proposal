use prototype_abstract::fuzzer::*;
use std::sync::atomic::{AtomicUsize, Ordering};

#[test]
fn fuzz_test_single_reproducible() {
    let seed = 2535;
    let config = FuzzConfig {
        world_width: 15,
        entity_density: 0.6,
    };

    run_case(&config, seed);
}

#[test]
#[ignore]
fn fuzz_test_high_density() {
    let config = FuzzConfig {
        world_width: 15,
        entity_density: 0.6,
    };
    let num_tests = 2000;
    let base_seed = 2000;
    run_fuzzer(config, num_tests, base_seed);
}

#[test]
#[ignore]
fn fuzz_test_sparse() {
    let config = FuzzConfig {
        world_width: 15,
        entity_density: 0.1,
    };
    let num_tests = 20;
    let base_seed = 3000;
    run_fuzzer(config, num_tests, base_seed);
}
fn run_fuzzer(config: FuzzConfig, num_tests: usize, base_seed: u64) {
    let failed = AtomicUsize::new(0);

    (0..num_tests).for_each(|i| {
        let seed = base_seed + i as u64;
        if !run_case(&config, seed) {
            failed.fetch_add(1, Ordering::Relaxed);
        }
    });

    let failed_count = failed.load(Ordering::Relaxed);
    println!("   Total tests: {}", num_tests);
    println!("   Failed: {}", failed_count);

    assert_eq!(failed_count, 0, "Failed");
}

fn run_case(config: &FuzzConfig, seed: u64) -> bool {
    let test_case = generate_test_case(seed, config);

    let result = match run_fuzz_test(&test_case) {
        Ok(result) => result,
        Err(e) => {
            eprintln!("❌ test failed (seed: {}): {}", test_case.seed, e);
            return false;
        }
    };

    if let Err(e) = result.check() {
        eprintln!("❌ test failed (seed: {}):\nError: {}", test_case.seed, e,);
        let markers = if let Some(pos) = e.1 {
            vec![pos]
        } else {
            vec![]
        };
        result.print_before_after(&markers);
        return false;
    } else {
        // println!("✅ test passed (seed: {})", test_case.seed);
    }
    true
}
