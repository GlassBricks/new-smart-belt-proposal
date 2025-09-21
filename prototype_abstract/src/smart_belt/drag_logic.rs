use super::{Action, LineDrag, action::Error, tile_classification::TileType};

#[derive(Debug, Clone, Copy)]
#[non_exhaustive]
pub enum DragState {
    /// After placing a belt. This belt may become an underground
    BeltPlaced,
    // We haven't placed a belt yet, and are looking for the next tile we can.
    // ErrorRecovery,
    // Passing a splitter or output underground belt. This means we can't create an underground here.
    // IntegratedOutput,
    /// We hovered over an obstacle.
    TraversingObstacle {
        // Last position we may place an underground belt.
        input_pos: i32,
        // Last position we placed an underground belt, if any.
        output_pos: Option<i32>,
    },
    /// After we have placed our _own_ output underground belt. This output underground may be moved later.
    OutputUgPlaced { input_pos: i32 },
    // We have just encountered an impassable obstacle. However, we don't error until the user tries to _pass_ the obstacle.
    // OverImpassable,
    // We are passing through an underground belt.
    // PassThrough {
    //     exit_position: i32,
    // },
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
            TileType::Usable => self.place_belt_or_underground(),
            TileType::Obstacle => self.handle_obstacle(),
            // TileType::IntegratedOutput => Action::IntegrateEntity,
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

    fn place_belt_or_underground(&self) -> StepResult {
        match self.last_state {
            DragState::BeltPlaced | DragState::OutputUgPlaced { .. } => {
                StepResult(Action::PlaceBelt, None, DragState::BeltPlaced)
            }
            DragState::TraversingObstacle {
                input_pos,
                output_pos,
            } => {
                let distance = self.next_position() - input_pos;
                if distance > self.tier.underground_distance.into() {
                    StepResult(
                        Action::PlaceBelt,
                        Some(Error::TooFarToConnect),
                        DragState::BeltPlaced,
                    )
                } else if let Some(previous_output) = output_pos {
                    StepResult(
                        Action::ExtendUnderground {
                            previous_output_pos: previous_output,
                            new_output_pos: self.next_position(),
                        },
                        None,
                        DragState::OutputUgPlaced { input_pos },
                    )
                } else {
                    StepResult(
                        Action::CreateUnderground {
                            input_pos,
                            output_pos: self.next_position(),
                        },
                        None,
                        DragState::OutputUgPlaced { input_pos },
                    )
                }
            }
        }
    }

    fn handle_obstacle(&self) -> StepResult {
        let new_state = match self.last_state {
            DragState::BeltPlaced => DragState::TraversingObstacle {
                input_pos: self.last_position,
                output_pos: None,
            },
            DragState::TraversingObstacle { .. } => self.last_state,
            DragState::OutputUgPlaced {
                input_pos: entrance_position,
            } => DragState::TraversingObstacle {
                input_pos: entrance_position,
                output_pos: Some(self.last_position),
            },
        };
        StepResult(Action::None, None, new_state)
    }
}
