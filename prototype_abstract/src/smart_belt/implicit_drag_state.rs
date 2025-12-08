use crate::smart_belt::drag::{DragContext, DragStepResult};

/// Implicit drag state implementation.
/// Uses an implicit representation of state based on world queries rather than
/// explicit state tracking.
#[derive(Debug, Clone)]
pub enum ImplicitDragState {
    /// Placeholder variant - to be replaced with actual implementation
    Placeholder,
}

impl ImplicitDragState {
    pub fn initial_state(_successful_placement: bool) -> Self {
        todo!("ImplicitDragState::initial_state")
    }

    pub fn step(&self, _ctx: &DragContext) -> DragStepResult {
        todo!("ImplicitDragState::step")
    }
}
