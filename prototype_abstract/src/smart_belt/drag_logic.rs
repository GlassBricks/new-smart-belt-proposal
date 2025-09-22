use super::{Action, LineDrag, action::Error, tile_classification::TileType};

#[derive(Debug, Clone)]
#[non_exhaustive]
pub enum DragState {
    /// After placing a belt. This belt may become an underground
    BeltPlaced {
        /// If the belt that used to be here had an output in the same direction as the drag.
        was_output: bool,
    },
    // We haven't placed a belt yet, and are looking for the next tile we can.
    // ErrorRecovery,
    // Passing a splitter or output underground belt. This means we can't create an underground here.
    // IntegratedOutput,
    /// We hovered over an obstacle.
    Traversing {
        /// Last position we may place an underground belt.
        input_pos: i32,
        /// If that last position used to be an output belt.
        input_pos_was_output: bool,
    },
    /// After we have placed our _own_ output underground belt. This output underground may be moved later.
    OutputUgPlaced {
        input_pos: i32,
        // output_pos is last_pos.
        output_ug_was_output: bool,
    },
    /// We hovered over an obstacle after placing an output underground belt.
    TraversingAfterOutput {
        /// Last position we may place an underground belt.
        input_pos: i32,
        /// Last position we placed an underground belt.
        output_pos: i32,
        output_pos_was_output: bool,
    },
    /// We have just encountered an impassable obstacle. However, we don't error until the user tries to _pass_ the obstacle.
    OverImpassableCurvedBelt,
    // We are passing through an underground belt.
    // PassThrough {
    //     exit_position: i32,
    // },
}

impl DragState {
    pub fn last_belt_was_output(&self) -> bool {
        match self {
            DragState::BeltPlaced { .. } | DragState::OutputUgPlaced { .. } => true,
            DragState::Traversing { .. }
            | DragState::TraversingAfterOutput { .. }
            | DragState::OverImpassableCurvedBelt => false,
        }
    }

    pub fn get_override_tuple(&self, pos_at_state: i32) -> Option<(i32, bool)> {
        match *self {
            DragState::BeltPlaced { was_output }
            | DragState::OutputUgPlaced {
                output_ug_was_output: was_output,
                ..
            } => Some((pos_at_state, was_output)),
            DragState::Traversing {
                input_pos: override_pos,
                input_pos_was_output: was_output,
            }
            | DragState::TraversingAfterOutput {
                input_pos: override_pos,
                output_pos_was_output: was_output,
                ..
            } => Some((override_pos, was_output)),
            DragState::OverImpassableCurvedBelt => todo!(),
        }
    }
}

pub(super) struct StepResult(pub Action, pub Option<Error>, pub DragState);

/**
 * Purely functional logic for straight line dragging.
 */
impl<'a> LineDrag<'a> {
    pub(super) fn process_next_tile_forwards(&self) -> StepResult {
        self.process_normal_state()
    }

    // fn process_pass_through(&self) -> StepResult {
    //     todo!()
    // let entity = self.world_view.get_entity_at_position(position);
    // let next_tile_type = match entity {
    //     Some(Entity::UndergroundBelt(ug))
    //         if ug.tier == tier && ug.shape_direction() == self.world_view.drag_direction() =>
    //     {
    //         TileType::IntegratedOutput
    //     }
    //     _ => TileType::PassThroughUnderground(tier),
    // };
    // StepResult {
    //     action: Action::None,
    //     next_tile_type,
    // }
    // }

    fn process_normal_state(&self) -> StepResult {
        match self.classify_next_tile() {
            TileType::Usable { was_output } => self.place_belt_or_underground(was_output),
            TileType::Obstacle => self.handle_obstacle(),
            TileType::ImpassableCurvedBelt => {
                StepResult(Action::None, None, DragState::OverImpassableCurvedBelt)
            } // TileType::IntegratedOutput => Action::IntegrateEntity,
              // TileType::PassThroughUnderground(_) => Action::IntegrateEntity, // beginning pass_through means seeing input ug
              // TileType::Obstacle => {
              // if matches!(prev_state, TileType::IntegratedOutput) {
              //     Action::EntityInTheWay
              // } else if self.underground_would_be_too_long(prev_state, position + 1) {
              //     Action::TooLongToReach
              // alternative: report too long to reach the moment it becomes too long, not after passing all obstacles
              // } else {
              //     Action::None
              // }
              // }
        }
    }

    fn place_belt_or_underground(&self, was_output: bool) -> StepResult {
        match self.last_state {
            DragState::BeltPlaced { .. }
            | DragState::OutputUgPlaced { .. }
            | DragState::OverImpassableCurvedBelt => {
                self.normal_result(Action::PlaceBelt, DragState::BeltPlaced { was_output })
            }
            DragState::Traversing { input_pos, .. }
            | DragState::TraversingAfterOutput { input_pos, .. }
                if self.next_position() - input_pos > self.tier.underground_distance.into() =>
            {
                StepResult(
                    Action::PlaceBelt,
                    Some(Error::TooFarToConnect),
                    DragState::BeltPlaced { was_output },
                )
            }
            DragState::Traversing { input_pos, .. } => self.normal_result(
                Action::CreateUnderground {
                    input_pos,
                    output_pos: self.next_position(),
                },
                DragState::OutputUgPlaced {
                    input_pos,
                    output_ug_was_output: was_output,
                },
            ),
            DragState::TraversingAfterOutput {
                input_pos,
                output_pos,
                ..
            } => self.normal_result(
                Action::ExtendUnderground {
                    previous_output_pos: output_pos,
                    new_output_pos: self.next_position(),
                },
                DragState::OutputUgPlaced {
                    input_pos,
                    output_ug_was_output: was_output,
                },
            ),
        }
    }

    fn handle_obstacle(&self) -> StepResult {
        let new_state = match self.last_state {
            DragState::BeltPlaced { was_output } => DragState::Traversing {
                input_pos: self.last_position,
                input_pos_was_output: was_output,
            },
            DragState::Traversing { .. } | DragState::TraversingAfterOutput { .. } => {
                self.last_state.clone()
            }
            DragState::OutputUgPlaced {
                input_pos: entrance_position,
                output_ug_was_output,
            } => DragState::TraversingAfterOutput {
                input_pos: entrance_position,
                output_pos: self.last_position,
                output_pos_was_output: output_ug_was_output,
            },
            DragState::OverImpassableCurvedBelt => todo!(),
        };
        self.normal_result(Action::None, new_state)
    }

    /// Returns an result with no errors.
    /// However, if the last state has a deferred error, it will be returned here.
    fn normal_result(&self, action: Action, new_state: DragState) -> StepResult {
        StepResult(action, self.deferred_error(), new_state)
    }

    /// When traversing an impassable obstacle, we give an error only when you pass it.
    fn deferred_error(&self) -> Option<Error> {
        match self.last_state {
            DragState::BeltPlaced { .. }
            | DragState::Traversing { .. }
            | DragState::OutputUgPlaced { .. }
            | DragState::TraversingAfterOutput { .. } => None,
            DragState::OverImpassableCurvedBelt => Some(Error::CurvedBeltInTheWay),
        }
    }
}
