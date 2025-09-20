use super::{Action, LineDrag, tile_classification::TileType};

#[derive(Debug, Clone, Copy)]
#[non_exhaustive]
pub enum DragState {
    /// After placing a belt. This belt may become an underground
    BeltPlaced,
    // We haven't placed a belt yet, and are looking for the next tile we can.
    // ErrorRecovery,
    // Passing a splitter or output underground belt. This means we can't create an underground here.
    // IntegratedOutput,
    // TraversingObstacle {
    //     // The last position where we can create (or have created) an underground belt.
    //     entrance_position: i32,
    //     // The output underground belt position, if we've created one.
    //     last_output_position_relative: Option<NonZeroI8>,
    // },
    // We have just encountered an impassable obstacle. However, we don't error until the user tries to _pass_ the obstacle.
    // OverImpassable,
    // We are passing through an underground belt.
    // PassThrough {
    //     exit_position: i32,
    // },
}

impl DragState {
    pub(super) fn is_outputting(&self, _position: i32) -> bool {
        match self {
            DragState::BeltPlaced => true,
        }
    }
}

pub struct StepResult(pub Action, pub DragState);

/**
 * Purely functional logic for straight line dragging.
 */
impl<'a> LineDrag<'a> {
    pub fn process_next_tile_forwards(&self) -> StepResult {
        self.process_normal_tile()
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

    fn process_normal_tile(&self) -> StepResult {
        match self.get_next_tile_type() {
            TileType::Usable => {
                if self.last_state.is_outputting(self.next_position()) {
                    self.place_belt()
                } else {
                    self.place_or_extend_underground()
                }
            }
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
            _ => todo!(),
        }
    }

    fn place_belt(&self) -> StepResult {
        let new_state = match self.last_state {
            DragState::BeltPlaced => DragState::BeltPlaced,
        };
        StepResult(Action::PlaceBelt, new_state)
    }

    fn place_or_extend_underground(&self) -> StepResult {
        todo!()
        // if let Some(input_position) = state.last_possible_entrance {
        //     if state.next_position() - input_position > self.belt_tier.underground_distance as i32 {
        //         Action::TooLongToReach
        //     } else if let Some(last_output_position) = state.last_output_position {
        //         Action::ReplaceUnderground {
        //             last_output_position,
        //         }
        //     } else {
        //         Action::PlaceNewUnderground { input_position }
        //     }
        // } else {
        //     // no entrance position; either recovering from an error or starting with an error.
        //     Action::PlaceBelt
        // }
    }
}
