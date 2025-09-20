use std::num::NonZeroI8;

use crate::entity::{Belt, Entity, Splitter, UndergroundBelt};
use crate::geometry::Direction::*;
use crate::{BeltTier, LoaderLike};

use super::{Action, LineDrag};

// todo: split out tile type with saved type
// todo: add last_tile_type, next_tile_type, etc. to the state
#[derive(Debug, Clone, PartialEq)]
pub enum TileType {
    Usable,
    Obstacle,
    /// An obstacle that's impossible to underground past.
    Impassable,
    /// Either: output underground we won't replace, or a splitter.
    IntegratedOutput,
    /// An input underground we will "pass-through" (don't do anything until reading the other side)
    PassThroughUnderground(BeltTier),
    /// An underground belt that we can't use (upgrading would break stuff)
    UnupgradableUnderground,
}

#[derive(Debug, Clone, Copy)]
pub enum DragState {
    /// After placing a belt. This belt may become an underground
    BeltPlaced,
    /// We haven't placed a belt yet, and are looking for the next tile we can.
    ErrorRecovery,
    /// After passing an IntegratedOutput tile. This means we can't create an underground here.
    IntegratedOutput,
    // Attempting to traverse an obstacle.
    TraversingObstacle {
        // The last position recorded where we can create an underground belt.
        entrance_position: i32,
        // The last output underground belt, if we've created one.
        last_output_position_relative: Option<NonZeroI8>,
    },
    /// We have just encountered an impassable obstacle. However, we don't error until the user tries to _pass_ the obstacle.
    OverImpassable,
    // We are passing through an underground belt.
    PassThrough {
        exit_position: i32,
    },
}

impl DragState {
    fn is_outputting(&self, position: i32) -> bool {
        match self {
            DragState::BeltPlaced => true,
            DragState::IntegratedOutput => true,
            DragState::TraversingObstacle {
                entrance_position,
                last_output_position_relative,
            } => last_output_position_relative
                .is_some_and(|r| *entrance_position + i8::from(r) as i32 == position - 1),
            DragState::ErrorRecovery
            | DragState::OverImpassable
            | DragState::PassThrough { .. } => false,
        }
    }
}

pub struct StepResult(pub Action, pub DragState);

/**
 * Purely functional logic for straight line dragging.
 */
impl<'a> LineDrag<'a> {
    pub fn process_next_tile_forwards(&self) -> StepResult {
        match self.last_state {
            DragState::PassThrough { .. } => self.process_pass_through(),
            DragState::OverImpassable => todo!(),
            // TileType::Impassable => StepResult {
            //     action: Action::ImpassableObstacle,
            //     next_tile_type: TileType::Usable,
            // },
            _ => self.process_normal_tile(),
        }
    }

    fn process_pass_through(&self) -> StepResult {
        todo!()
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
    }

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

    fn get_next_tile_type(&self) -> TileType {
        let entity = self
            .world_view()
            .get_entity_at_position(self.next_position());
        match entity {
            Some(Entity::Belt(belt)) => self.classify_belt(belt),
            Some(Entity::UndergroundBelt(ug)) => self.classify_underground(ug),
            Some(Entity::Splitter(splitter)) => self.classify_splitter(splitter),
            Some(Entity::LoaderLike(loader)) => self.classify_loader(loader),
            Some(Entity::OtherColliding) => TileType::Obstacle,
            None => self.classify_empty_tile(),
        }
    }

    fn classify_belt(&self, belt: &Belt) -> TileType {
        match self.world_view().relative_direction(belt.direction) {
            East | West => {
                if self.belt_was_connected_forward(self.last_position) {
                    TileType::Impassable
                } else {
                    TileType::Obstacle
                }
            }
            North => {
                if self.world_view().belt_was_curved(belt) {
                    TileType::Obstacle
                } else if self.last_state.is_outputting(self.last_position) {
                    TileType::Usable
                } else {
                    self.try_enter_belt_segment(belt)
                }
            }
            South => self.try_enter_belt_segment(belt),
        }
    }

    fn belt_was_connected_forward(&self, _position: i32) -> bool {
        // todo: handle cases when a belt only used to be curved
        true
    }

    fn try_enter_belt_segment(&self, _belt: &Belt) -> TileType {
        if self.should_ug_over_belt_segment_backwards_belt() {
            TileType::Obstacle
        } else {
            TileType::Usable
        }
    }

    fn classify_underground(&self, ug: &UndergroundBelt) -> TileType {
        let relative_dir = self
            .world_view()
            .relative_direction(ug.shape_direction().opposite());

        match relative_dir {
            East | West => TileType::Obstacle,
            North | South if !self.world_view().is_ug_paired(ug) => TileType::Usable,
            North => self.try_integrate_underground(ug),
            South => self.try_skip_underground(ug),
        }
    }

    fn try_integrate_underground(&self, ug: &UndergroundBelt) -> TileType {
        if self.tier != ug.tier && self.world_view().can_upgrade_underground(ug, &self.tier) {
            TileType::UnupgradableUnderground
        } else {
            TileType::PassThroughUnderground(self.tier)
        }
    }

    fn try_skip_underground(&self, ug: &UndergroundBelt) -> TileType {
        if self.tier == ug.tier {
            TileType::Impassable
        } else {
            TileType::Obstacle
        }
    }

    fn classify_splitter(&self, splitter: &Splitter) -> TileType {
        if matches!(
            self.world_view().relative_direction(splitter.direction),
            North
        ) && self.last_state.is_outputting(self.last_position)
            && self.should_ug_over_belt_segment_after_splitter()
        {
            TileType::Obstacle
        } else {
            TileType::IntegratedOutput
        }
    }

    fn classify_loader(&self, loader: &LoaderLike) -> TileType {
        if self.belt_connects_into_loader(loader) {
            TileType::Impassable
        } else {
            TileType::Obstacle
        }
    }

    pub fn belt_connects_into_loader(&self, loader: &LoaderLike) -> bool {
        // todo: handle backwards dragging
        loader.is_input && loader.direction == self.world_view().drag_direction()
    }

    fn classify_empty_tile(&self) -> TileType {
        if self.world_view().can_place_belt_on_tile(self.last_position) {
            TileType::Usable
        } else if self
            .world_view()
            .is_undergroundable_tile(self.last_position)
        {
            todo!()
        } else {
            todo!()
        }
    }

    fn place_belt(&self) -> StepResult {
        let new_state = match self.last_state {
            DragState::BeltPlaced => DragState::BeltPlaced,
            DragState::ErrorRecovery => todo!(),
            DragState::IntegratedOutput => todo!(),
            DragState::TraversingObstacle { .. } => todo!(),
            DragState::OverImpassable => todo!(),
            DragState::PassThrough { .. } => todo!(),
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

    /// After a _forwards_ splitter:
    ///
    /// splitter* forwards_belt* curved_belt
    ///
    /// Future extension 1: also consider belt weaving
    /// splitter* (forwards_belt | diff_tier_paired_ug)* curved_belt
    ///
    /// Extension 2: also consider blocked undergrounds
    /// splitter* (forwards_belt | diff_tier_paired_ug)* obstacle
    fn should_ug_over_belt_segment_after_splitter(&self) -> bool {
        todo!()
        // // assumes: first_belt_entity is straight

        // // todo: refactor to remove need for this assertion
        // assert!(state.last_tile_type.is_output());

        // let belt_direction = self.world_view.belt_direction();

        // // ug over a belt segment, if there's something in it that would break the belt line if we try to enter it.
        // let last_input_position = state
        //     .last_possible_entrance
        //     .expect("todo: refactor to remove need for this assertion");
        // let furthest_output_position =
        //     last_input_position + self.belt_tier.underground_distance as i32;

        // let entity_iter = (state.next_position()..furthest_output_position).map_while(|position| {
        //     self.world_view
        //         .get_entity_at_position(position)
        //         .and_then(|e| e.as_belt_like())
        //         .map(|e| (position, e))
        // });
        // let mut splitter_skip = entity_iter.skip_while(|(_, e)| {
        //     e.as_splitter()
        //         .is_some_and(|s| s.direction == belt_direction)
        // });

        // let last_entity = splitter_skip.find(|(_, e)| {
        //     !e.as_belt().is_some_and(|belt| {
        //         belt.direction == belt_direction && !self.world_view.belt_is_curved(belt)
        //     })
        // });
        // last_entity.is_some_and(|(position, belt)| {
        //     belt.as_belt().is_some_and(|belt| {
        //         belt.direction == belt_direction && self.world_view.belt_is_curved(belt)
        //     }) && self.world_view.belt_directly_connects_into_next(position)
        // })
    }

    fn should_ug_over_belt_segment_backwards_belt(&self) -> bool {
        todo!()
    }
}
