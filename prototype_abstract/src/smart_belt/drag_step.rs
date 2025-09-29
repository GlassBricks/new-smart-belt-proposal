use crate::{
    Impassable,
    smart_belt::{DragWorldView, TileClassifierState},
};

use super::{Action, LineDrag, TileClassifier, TileType, action::Error};

#[derive(Debug, Clone)]
#[non_exhaustive]
pub enum DragState {
    Normal(NormalState),
    PassThrough { output_pos: i32 },
}

/// Most states here.
#[derive(Debug, Clone)]
#[non_exhaustive]
pub enum NormalState {
    /// After placing a belt. This belt may become an underground
    BeltPlaced,
    /// We haven't placed a belt yet, and are looking for the next tile we can.
    ErrorState { over_impassable: bool },
    /// We hovered over an obstacle.
    Traversing {
        /// Last position we may place an underground belt.
        input_pos: i32,
    },
    /// After we have placed our _own_ output underground belt. This output underground may be moved later.
    OutputUgPlaced {
        input_pos: i32,
        // output_pos is last_pos.
    },
    /// We hovered over an obstacle after placing an output underground belt.
    TraversingAfterOutput {
        /// Last position we may place an underground belt.
        input_pos: i32,
        /// Last position we placed an underground belt.
        output_pos: i32,
    },
    /// When we are hovering over the exit of an integrated output belt.
    IntegratedOutput,
}

impl From<NormalState> for DragState {
    fn from(val: NormalState) -> Self {
        DragState::Normal(val)
    }
}

impl TileClassifierState for NormalState {
    fn can_enter_next_tile(&self) -> bool {
        // For error states, we allow entering.
        // This allows e.g. entering a splitter to upgrade it, starting from hovering over an obstacle.
        match self {
            NormalState::Traversing { .. } | NormalState::TraversingAfterOutput { .. } => false,
            NormalState::BeltPlaced
            | NormalState::OutputUgPlaced { .. }
            | NormalState::IntegratedOutput
            | NormalState::ErrorState { .. } => true,
        }
    }
    fn underground_input_pos(&self, last_position: i32) -> Option<i32> {
        match *self {
            NormalState::BeltPlaced => Some(last_position),
            NormalState::Traversing { input_pos, .. }
            | NormalState::OutputUgPlaced { input_pos, .. }
            | NormalState::TraversingAfterOutput { input_pos, .. } => Some(input_pos),
            _ => None,
        }
    }
}

pub(super) struct DragStep(pub Action, pub Option<Error>, pub DragState);

/**
 * Purely functional logic for straight line dragging.
 */
impl<'a> LineDrag<'a> {
    pub(super) fn normal_state_step(&self, last_state: &NormalState, is_forward: bool) -> DragStep {
        let next_tile = TileClassifier::new(
            self.world_view(is_forward),
            self.tier,
            last_state,
            self.last_position,
        )
        .classify_next_tile();
        eprintln!("Tile type: {:?}", next_tile);
        match next_tile {
            TileType::Usable => self.place_belt_or_underground(last_state, is_forward),
            TileType::Obstacle => self.handle_obstacle(last_state),
            TileType::IntegratedSplitter => DragStep(
                Action::IntegrateSplitter,
                None,
                NormalState::IntegratedOutput.into(),
            ),
            TileType::ImpassableObstacle => self.handle_impassable_obstacle(last_state),
            TileType::IntegratedUnderground { output_pos } => {
                self.integrate_underground_pair(is_forward, output_pos)
            }
        }
    }

    fn world_view(&self, is_forward: bool) -> DragWorldView<'_> {
        DragWorldView::new(self.world, self.ray, self.tile_history.as_ref(), is_forward)
    }

    fn place_belt_or_underground(&self, last_state: &NormalState, is_forward: bool) -> DragStep {
        match last_state {
            NormalState::BeltPlaced
            | NormalState::OutputUgPlaced { .. }
            | NormalState::ErrorState { .. }
            | NormalState::IntegratedOutput => {
                DragStep(Action::PlaceBelt, None, NormalState::BeltPlaced.into())
            }
            &NormalState::Traversing { input_pos, .. } => {
                if let Err(error) = self.check_can_underground(input_pos, is_forward, false) {
                    DragStep(
                        Action::PlaceBelt,
                        Some(error),
                        NormalState::BeltPlaced.into(),
                    )
                } else {
                    DragStep(
                        Action::CreateUnderground {
                            input_pos,
                            output_pos: self.next_position(is_forward),
                        },
                        None,
                        NormalState::OutputUgPlaced { input_pos }.into(),
                    )
                }
            }
            &NormalState::TraversingAfterOutput {
                input_pos,
                output_pos,
            } => {
                if let Err(error) = self.check_can_underground(input_pos, is_forward, true) {
                    DragStep(
                        Action::PlaceBelt,
                        Some(error),
                        NormalState::BeltPlaced.into(),
                    )
                } else {
                    DragStep(
                        Action::ExtendUnderground {
                            previous_output_pos: output_pos,
                            new_output_pos: self.next_position(is_forward),
                        },
                        None,
                        NormalState::OutputUgPlaced { input_pos }.into(),
                    )
                }
            }
        }
    }

    fn check_can_underground(
        &self,
        input_pos: i32,
        is_forward: bool,
        is_extension: bool,
    ) -> Result<(), Error> {
        let distance = self.next_position(is_forward).abs_diff(input_pos);
        if distance > self.tier.underground_distance.into() {
            return Err(Error::TooFarToConnect);
        }
        let world_view = self.world_view(is_forward);
        // check all tiles
        let output_pos = self.next_position(is_forward);
        let start_pos = if !is_extension {
            input_pos
        } else {
            self.last_position
        };
        let check_pos = |pos| {
            let Some(entity) = world_view.get_entity(pos) else {
                return Ok(());
            };
            if entity.as_any().is::<Impassable>() {
                return Err(Error::CannotTraversePastTile);
            }
            if let Some(ug) = entity.as_underground_belt()
                && ug.direction.axis() == self.ray.direction.axis()
                && ug.tier == self.tier
            {
                // can't ug over this underground
                return Err(Error::CannotTraversePastEntity);
            }
            Ok(())
        };
        if is_forward {
            for pos in start_pos + 1..=output_pos - 1 {
                check_pos(pos)?;
            }
        } else {
            // start: 0  output: -2
            for pos in (output_pos + 1..=start_pos).rev() {
                check_pos(pos)?;
            }
        }

        Ok(())
    }

    fn handle_obstacle(&self, last_state: &NormalState) -> DragStep {
        let new_state = match last_state {
            NormalState::BeltPlaced => NormalState::Traversing {
                input_pos: self.last_position,
            },
            NormalState::Traversing { .. } | NormalState::TraversingAfterOutput { .. } => {
                last_state.clone()
            }
            NormalState::ErrorState { .. } => NormalState::ErrorState {
                over_impassable: false,
            },
            &NormalState::OutputUgPlaced {
                input_pos: entrance_position,
            } => NormalState::TraversingAfterOutput {
                input_pos: entrance_position,
                output_pos: self.last_position,
            },

            NormalState::IntegratedOutput => {
                return DragStep(
                    Action::None,
                    Some(Error::EntityInTheWay),
                    NormalState::ErrorState {
                        over_impassable: false,
                    }
                    .into(),
                );
            }
        };
        DragStep(Action::None, None, new_state.into())
    }

    fn integrate_underground_pair(&self, is_forward: bool, output_pos: i32) -> DragStep {
        let can_upgrade = self.can_upgrade_underground(is_forward, output_pos);
        let action = Action::IntegrateUndergroundPair {
            do_upgrade: can_upgrade,
        };
        let error = if !can_upgrade {
            Some(Error::CannotUpgradeUnderground)
        } else {
            None
        };
        DragStep(action, error, DragState::PassThrough { output_pos })
    }

    fn can_upgrade_underground(&self, is_forward: bool, output_pos: i32) -> bool {
        let input_pos = self.next_position(is_forward);
        if output_pos.abs_diff(input_pos) > self.tier.underground_distance as u32 {
            // Upgrading would make the pair too short
            return false;
        }

        // Check if there are any existing underground belts in between that would cut this belt segment.
        let between_range = if is_forward {
            input_pos + 1..=output_pos - 1
        } else {
            output_pos + 1..=input_pos - 1
        };

        !between_range.into_iter().any(|pos| {
            self.world_view(is_forward)
                .get_entity(pos)
                .and_then(|e| e.as_underground_belt())
                .is_some_and(|e| {
                    e.tier == self.tier && e.direction.axis() == self.ray.direction.axis()
                })
        })
    }

    fn handle_impassable_obstacle(&self, last_state: &NormalState) -> DragStep {
        let next_state = match last_state {
            // if already in error state, ignore further errors
            NormalState::ErrorState { .. } => NormalState::ErrorState {
                over_impassable: false,
            },
            _ => NormalState::ErrorState {
                over_impassable: true,
            },
        };
        DragStep(Action::None, None, next_state.into())
    }
}
