use itertools::Itertools;

use crate::{Impassable, smart_belt::DragWorldView};

use super::{Action, LineDrag, TileClassifier, TileType, action::Error};

#[derive(Debug, Clone)]
#[non_exhaustive]
pub(super) enum DragState {
    Normal(NormalState),
    PassThrough { output_pos: i32 },
}

/// Most states here.
#[derive(Debug, Clone)]
#[non_exhaustive]
pub(super) enum NormalState {
    /// After placing a belt. This belt may become an underground
    BeltPlaced,
    /// We haven't placed a belt yet, and are looking for the next tile we can.
    ErrorRecovery,
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
    /// We have just encountered an impassable obstacle. However, we don't error until the user tries to _pass_ the obstacle.
    OverImpassableObstacle,
}

impl From<NormalState> for DragState {
    fn from(val: NormalState) -> Self {
        DragState::Normal(val)
    }
}

impl NormalState {
    pub(super) fn can_enter_next_tile(&self) -> bool {
        // For error states (OverImpassableObstacle, ErrorRecovery), we allow entering.
        // This allows e.g. entering a splitter to upgrade it, starting from hovering over an obstacle.
        match self {
            NormalState::Traversing { .. } | NormalState::TraversingAfterOutput { .. } => false,
            NormalState::BeltPlaced
            | NormalState::OutputUgPlaced { .. }
            | NormalState::IntegratedOutput
            | NormalState::OverImpassableObstacle
            | NormalState::ErrorRecovery => true,
        }
    }
}

pub(super) struct DragStep(pub Action, pub Vec<Error>, pub DragState);

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
            TileType::IntegratedSplitter => {
                self.normal_result(Action::IntegrateSplitter, NormalState::IntegratedOutput)
            }
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
            | NormalState::OverImpassableObstacle
            | NormalState::ErrorRecovery
            | NormalState::IntegratedOutput => {
                self.normal_result(Action::PlaceBelt, NormalState::BeltPlaced)
            }
            &NormalState::Traversing { input_pos, .. } => {
                if let Err(errors) = self.check_can_underground(input_pos, is_forward, false) {
                    DragStep(Action::PlaceBelt, errors, NormalState::BeltPlaced.into())
                } else {
                    self.normal_result(
                        Action::CreateUnderground {
                            input_pos,
                            output_pos: self.next_position(is_forward),
                        },
                        NormalState::OutputUgPlaced { input_pos },
                    )
                }
            }
            &NormalState::TraversingAfterOutput {
                input_pos,
                output_pos,
            } => {
                if let Err(errors) = self.check_can_underground(input_pos, is_forward, true) {
                    DragStep(Action::PlaceBelt, errors, NormalState::BeltPlaced.into())
                } else {
                    self.normal_result(
                        Action::ExtendUnderground {
                            previous_output_pos: output_pos,
                            new_output_pos: self.next_position(is_forward),
                        },
                        NormalState::OutputUgPlaced { input_pos },
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
    ) -> Result<(), Vec<Error>> {
        let distance = self.next_position(is_forward).abs_diff(input_pos);
        if distance > self.tier.underground_distance.into() {
            return Err(vec![Error::TooFarToConnect]);
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
                return Err(vec![Error::CannotTraversePastTile]);
            }
            if let Some(ug) = entity.as_underground_belt()
                && ug.direction.axis() == self.ray.direction.axis()
                && ug.tier == self.tier
            {
                // can't ug over this underground
                return Err(vec![Error::CannotTraversePastEntity]);
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
            NormalState::ErrorRecovery => NormalState::ErrorRecovery,
            &NormalState::OutputUgPlaced {
                input_pos: entrance_position,
            } => NormalState::TraversingAfterOutput {
                input_pos: entrance_position,
                output_pos: self.last_position,
            },
            NormalState::OverImpassableObstacle => NormalState::ErrorRecovery,
            NormalState::IntegratedOutput => {
                return DragStep(
                    Action::None,
                    vec![Error::EntityInTheWay],
                    NormalState::ErrorRecovery.into(),
                );
            }
        };
        self.normal_result(Action::None, new_state)
    }

    fn integrate_underground_pair(&self, is_forward: bool, output_pos: i32) -> DragStep {
        let can_upgrade = self.can_upgrade_underground(is_forward, output_pos);
        let action = Action::IntegrateUndergroundPair {
            do_upgrade: can_upgrade,
        };
        let errors = self
            .deferred_error()
            .into_iter()
            .chain((!can_upgrade).then_some(Error::CannotUpgradeUnderground))
            .collect_vec();
        DragStep(action, errors, DragState::PassThrough { output_pos })
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
            NormalState::ErrorRecovery | NormalState::OverImpassableObstacle => {
                NormalState::ErrorRecovery
            }
            _ => NormalState::OverImpassableObstacle,
        };
        self.normal_result(Action::None, next_state)
    }

    /// Returns an result with no errors.
    /// However, if the last state has a deferred error, it will be returned here.
    fn normal_result(&self, action: Action, new_state: impl Into<DragState>) -> DragStep {
        DragStep(
            action,
            self.deferred_error().into_iter().collect(),
            new_state.into(),
        )
    }

    /// When traversing an impassable obstacle, we give an error only when you pass it.
    fn deferred_error(&self) -> Option<Error> {
        match &self.last_state {
            DragState::Normal(NormalState::OverImpassableObstacle) => {
                Some(Error::CannotTraversePastEntity)
            }
            _ => None,
        }
    }
}
