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
        last_input_position: i32,
        // Last position we placed an underground belt, if any.
        output_position: Option<i32>,
    },
    /// After we have placed our _own_ output underground belt. This output underground may be moved later.
    OutputUgPlaced { entrance_position: i32 },
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
                last_input_position: input_position,
                output_position,
            } => {
                if let Some(ug) = output_position {
                    todo!("Handle moving output underground, {:?}", ug)
                } else {
                    let next_position = self.next_position();
                    let distance = next_position - input_position;
                    if distance > self.tier.underground_distance.into() {
                        StepResult(
                            Action::PlaceBelt,
                            Some(Error::TooFarToConnect),
                            DragState::BeltPlaced,
                        )
                    } else {
                        StepResult(
                            Action::CreateUnderground(input_position, next_position),
                            None,
                            DragState::OutputUgPlaced {
                                entrance_position: input_position,
                            },
                        )
                    }
                }
            }
        }
    }

    fn handle_obstacle(&self) -> StepResult {
        let new_state = match self.last_state {
            DragState::BeltPlaced => DragState::TraversingObstacle {
                last_input_position: self.last_position,
                output_position: None,
            },
            DragState::TraversingObstacle { .. } => self.last_state,
            DragState::OutputUgPlaced { .. } => {
                todo!()
            }
        };
        StepResult(Action::None, None, new_state)
    }
}
