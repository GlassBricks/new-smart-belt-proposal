#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DragDirection {
    Forward,
    Backward,
}

impl DragDirection {
    pub fn direction_multiplier(self) -> i32 {
        match self {
            DragDirection::Forward => 1,
            DragDirection::Backward => -1,
        }
    }

    pub fn swap_if_backwards<T>(self, a: T, b: T) -> (T, T) {
        match self {
            DragDirection::Forward => (a, b),
            DragDirection::Backward => (b, a),
        }
    }
}
