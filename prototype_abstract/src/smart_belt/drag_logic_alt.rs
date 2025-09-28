use crate::{
    BeltConnectableEnum,
    smart_belt::{DragState, NormalState},
};

#[allow(dead_code)]
pub enum AltDragState {
    Normal,
    ErrorRecovery,
    OverImpassable,
    TraversingObstacle {
        input_pos: i32,
        output_pos: Option<i32>,
        output_owned: bool,
    },
}
#[allow(dead_code)]
impl AltDragState {
    fn from_drag_state(drag_state: &DragState, pos: i32) -> Self {
        match drag_state {
            &DragState::PassThrough {
                input_pos,
                output_pos,
            } => AltDragState::TraversingObstacle {
                input_pos,
                output_pos: Some(output_pos),
                output_owned: false,
            },
            DragState::Normal(normal_state) => match *normal_state {
                NormalState::BeltPlaced | NormalState::IntegratedOutput => AltDragState::Normal,
                NormalState::ErrorRecovery => AltDragState::ErrorRecovery,
                NormalState::OverImpassableObstacle => AltDragState::OverImpassable,
                NormalState::Traversing { input_pos } => AltDragState::TraversingObstacle {
                    input_pos,
                    output_pos: None,
                    output_owned: false,
                },
                NormalState::OutputUgPlaced { input_pos } => AltDragState::TraversingObstacle {
                    input_pos,
                    output_pos: Some(pos),
                    output_owned: true,
                },
                NormalState::TraversingAfterOutput {
                    input_pos,
                    output_pos,
                } => AltDragState::TraversingObstacle {
                    input_pos,
                    output_pos: Some(output_pos),
                    output_owned: true,
                },
            },
        }
    }

    fn to_drag_state(&self, pos: i32, entity_at_pos: Option<BeltConnectableEnum>) -> DragState {
        match *self {
            AltDragState::Normal => match entity_at_pos {
                Some(BeltConnectableEnum::Splitter(_)) => NormalState::IntegratedOutput,
                _ => NormalState::BeltPlaced,
            }
            .into(),
            AltDragState::ErrorRecovery => NormalState::ErrorRecovery.into(),
            AltDragState::OverImpassable => NormalState::OverImpassableObstacle.into(),
            AltDragState::TraversingObstacle {
                input_pos,
                output_pos: None,
                output_owned: _,
            } => NormalState::Traversing { input_pos }.into(),
            AltDragState::TraversingObstacle {
                input_pos,
                output_pos: Some(output_pos),
                output_owned: true,
            } if output_pos == pos => NormalState::Traversing { input_pos }.into(),
            AltDragState::TraversingObstacle {
                input_pos,
                output_pos: Some(output_pos),
                output_owned: true,
            } => NormalState::TraversingAfterOutput {
                input_pos,
                output_pos,
            }
            .into(),
            AltDragState::TraversingObstacle {
                input_pos,
                output_pos: Some(output_pos),
                output_owned: false,
            } => DragState::PassThrough {
                input_pos,
                output_pos,
            },
        }
    }
}
