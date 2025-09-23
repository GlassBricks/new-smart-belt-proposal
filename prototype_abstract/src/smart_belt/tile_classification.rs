use crate::RelativeDirection::*;
use crate::belts::LoaderLike;
use crate::belts::Splitter;
use crate::belts::UndergroundBelt;
use crate::belts::{Belt, BeltConnectableEnum};
use crate::not_yet_impl;

use super::LineDrag;
use super::drag_logic::DragState;

#[derive(Debug, Clone, PartialEq)]
pub(super) enum TileType {
    /// A tile we can place or fast-replace belt on.
    Usable,
    /// An obstacle we want to underground over.
    Obstacle,
    // An obstacle that's impossible to underground past. Includes:
    // - Impassable tiles
    // - Curved belt
    // - An underground belt of the same tier we don't or can't integrate
    ImpassableCurvedBelt,
    // An integrated splitter. Should not be replaced with underground belt.
    // IntegratedSplitter,
    // An input underground we will "pass-through" (don't do anything until reading the other side)
    // PassThroughUnderground(BeltTier),
    // An input underground belt that we can't use (as upgrading would break stuff).
    // UnupgradableUnderground,
}

impl<'a> LineDrag<'a> {
    /// most things are simple to classify. The tricky cases are in existing belt-like-entities.
    pub(super) fn classify_next_tile(&self) -> TileType {
        if let Some(entity) = self
            .world_view()
            .get_entity_at_position(self.next_position())
        {
            match entity.as_belt_connectable() {
                Some(BeltConnectableEnum::Belt(belt)) => self.classify_belt(belt),
                Some(BeltConnectableEnum::UndergroundBelt(ug)) => self.classify_underground(ug),
                Some(BeltConnectableEnum::Splitter(splitter)) => self.classify_splitter(splitter),
                Some(BeltConnectableEnum::LoaderLike(loader)) => self.classify_loader(loader),
                None => TileType::Obstacle,
            }
        } else {
            self.classify_empty_tile()
        }
    }

    fn classify_belt(&self, belt: &Belt) -> TileType {
        if self
            .world_view()
            .belt_was_curved(self.next_position(), belt)
        {
            self.classify_curved_belt()
        } else {
            self.classify_straight_belt(belt)
        }
    }

    fn classify_straight_belt(&self, belt: &Belt) -> TileType {
        match self.world_view().relative_direction(belt.direction) {
            // perpendicular belt
            Left | Right => TileType::Obstacle,
            // if the previous tile is an obstacle and directly connects to this belt, it's an obstacle.
            Forward | Backward if self.aligned_belt_is_obstacle() => TileType::Obstacle,
            Forward => {
                match self.last_state {
                    DragState::BeltPlaced
                    | DragState::OutputUgPlaced { .. }
                    | DragState::Traversing { .. }
                    | DragState::TraversingAfterOutput { .. }
                    | DragState::OverImpassableCurvedBelt => {
                        // Forwards straight belt is always usable!
                        TileType::Usable
                    }
                }
            }
            Backward => {
                if self.should_ug_over_backwards_segment() {
                    TileType::Obstacle
                } else {
                    TileType::Usable
                }
            }
        }
    }

    fn classify_curved_belt(&self) -> TileType {
        // If we are trying to integrate a curved belt...
        if self.last_state.is_outputting_belt()
            && self
                .world_view()
                .belt_was_directly_connected_to_previous(self.next_position())
        {
            // it's impassable (smart belt is not allowed to rotate belt)
            TileType::ImpassableCurvedBelt
        } else {
            // Any other curved belt is a normal obstacle
            TileType::Obstacle
        }
    }

    fn aligned_belt_is_obstacle(&self) -> bool {
        // If the last tile was an obstacle
        self.last_state.is_traversing_obstacle()
        // and this tile directly connects to it
            && self
                .world_view()
                .belt_was_directly_connected_to_previous(self.next_position())
        // then this belt is also an obstacle.
    }

    fn classify_underground(&self, _ug: &UndergroundBelt) -> TileType {
        todo!()
        // let relative_dir = self
        //     .world_view()
        //     .relative_direction(ug.shape_direction().opposite());

        // match relative_dir {
        //     Left | Right => TileType::Obstacle,
        //     Forward | Backward if !self.world_view().is_ug_paired(ug) => TileType::Usable { was_output: todo!() },
        //     Forward => self.try_integrate_underground(ug),
        //     Backward => self.try_skip_underground(ug),
        // }
    }

    // fn try_integrate_underground(&self, ug: &UndergroundBelt) -> TileType {
    //     if self.tier != ug.tier && self.world_view().can_upgrade_underground(ug, &self.tier) {
    //         todo!()
    //         // TileType::UnupgradableUnderground
    //     } else {
    //         todo!()
    //         // TileType::PassThroughUnderground(self.tier)
    //     }
    // }

    // fn try_skip_underground(&self, ug: &UndergroundBelt) -> TileType {
    //     if self.tier == ug.tier {
    //         todo!()
    //         // TileType::Impassable
    //     } else {
    //         todo!()
    //         // TileType::Obstacle
    //     }
    // }

    fn classify_splitter(&self, _splitter: &Splitter) -> TileType {
        todo!()
        // if self.world_view().relative_direction(splitter.direction) == Forward
        //     && self.should_ug_over_belt_segment_after_splitter()
        //     && todo!()
        // {
        //     todo!()
        //     // TileType::Obstacle
        // } else {
        //     todo!()
        //     // TileType::IntegratedSplitter
        // }
    }

    fn classify_loader(&self, loader: &LoaderLike) -> TileType {
        if self.belt_connects_into_loader(loader) {
            todo!()
            // TileType::Impassable
        } else {
            todo!()
            // TileType::Obstacle
        }
    }

    fn belt_connects_into_loader(&self, _loader: &LoaderLike) -> bool {
        todo!()
        // todo: handle backwards dragging
        // loader.is_input && loader.direction == self.world_view().drag_direction()
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

    // After a _forwards_ splitter:
    //
    // splitter* forwards_belt* curved_belt
    //
    // Future extension 1: also consider belt weaving
    // splitter* (forwards_belt | diff_tier_paired_ug)* curved_belt
    //
    // Extension 2: also consider blocked undergrounds
    // splitter* (forwards_belt | diff_tier_paired_ug)* obstacle
    // fn should_ug_over_belt_segment_after_splitter(&self) -> bool {
    //     todo!()
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
    // }

    /// Check the belt segment.
    /// We ug over a backwards belt segment if:
    /// it consists only of straight backwards belt segments and underground belts, at least
    /// as far as the current underground might reach.
    fn should_ug_over_backwards_segment(&self) -> bool {
        // if we made the decision in the last tile, return that
        if self.last_state.is_outputting_belt()
            && self
                .world_view()
                .belt_was_directly_connected_to_previous(self.next_position())
        {
            return false;
        }

        let Some(max_underground_position) = self.max_underground_position() else {
            // if we can't underground over it, default to including, it even if we may error.
            return false;
        };

        // iterate over belt segment, check for bad entities.
        // Only check up to _before_ the max underground position, to avoid long-distance
        // dependencies. If there is a bad entity _past_ the max underground position, we
        // can't underground over this anyways; so we just pick one error.
        for position in self.next_position()..max_underground_position {
            let world_view = self.world_view();
            let Some(belt_connectable) = world_view
                .get_entity_at_position(position)
                .and_then(|f| f.as_belt_connectable())
            else {
                break;
            };
            let backwards_dir = world_view.drag_direction().opposite();
            match belt_connectable {
                BeltConnectableEnum::Belt(belt) => {
                    if belt.direction != backwards_dir {
                        not_yet_impl!("Forwards absolute direction, backwards relative direction");
                        break;
                    }
                    if self.world_view().belt_is_curved(position, belt) {
                        return true;
                    }
                }
                BeltConnectableEnum::UndergroundBelt(_) => todo!(),
                BeltConnectableEnum::Splitter(_) => todo!(),
                BeltConnectableEnum::LoaderLike(_) => todo!(),
            }
        }
        // default: integrate this belt segment
        false
    }

    fn max_underground_position(&self) -> Option<i32> {
        let input_pos = match self.last_state {
            DragState::BeltPlaced => Some(self.last_position),
            DragState::Traversing { input_pos, .. }
            | DragState::OutputUgPlaced { input_pos, .. }
            | DragState::TraversingAfterOutput { input_pos, .. } => Some(input_pos),
            DragState::OverImpassableCurvedBelt => None,
        };
        input_pos.map(|f| f + self.tier.underground_distance as i32)
    }
}
