#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RaySense {
    Forward,
    Backward,
}

impl RaySense {
    pub fn direction_multiplier(self) -> i32 {
        match self {
            RaySense::Forward => 1,
            RaySense::Backward => -1,
        }
    }

    pub fn swap_if_backwards<T>(self, a: T, b: T) -> (T, T) {
        match self {
            RaySense::Forward => (a, b),
            RaySense::Backward => (b, a),
        }
    }
}
