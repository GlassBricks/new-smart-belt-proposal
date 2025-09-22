use crate::RelativeDirection::*;
use crate::belts::LoaderLike;
use crate::belts::Splitter;
use crate::belts::UndergroundBelt;
use crate::belts::{Belt, BeltConnectableEnum};
use crate::note;

use super::LineDrag;
use super::drag_logic::DragState;

#[derive(Debug, Clone, PartialEq)]
pub(super) enum TileType {
    /// A tile we can place or fast-replace belt on.
    Usable {
        /// Whether this tile was previously an output underground belt
        was_output: bool,
    },
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
        match self.world_view().relative_direction(belt.direction) {
            // perpendicular belt
            Left | Right => {
                // if we directly run into a curved belt, it's an impassable obstacle.
                if self.running_into_existing_curved_belt(belt) {
                    // This is an impassable obstacle.
                    TileType::ImpassableCurvedBelt
                } else {
                    // Normal obstacle
                    TileType::Obstacle
                }
            }
            // if the previous tile is an obstacle and directly connects to this belt, it's an obstacle.
            Forward | Backward if self.aligned_belt_is_obstacle(belt) => TileType::Obstacle,
            Forward => {
                let was_output = self.world_view().belt_is_output(belt);
                match self.last_state {
                    DragState::BeltPlaced { .. }
                    | DragState::OutputUgPlaced { .. }
                    | DragState::Traversing { .. }
                    | DragState::TraversingAfterOutput { .. }
                    | DragState::OverImpassableCurvedBelt => {
                        // if we directly run into a straight belt, use it.
                        TileType::Usable { was_output }
                    }
                }
            }
            Backward => {
                let was_output = self.world_view().belt_is_output(belt);
                if self.should_ug_over_belt_segment_backwards_belt() {
                    TileType::Obstacle
                } else {
                    TileType::Usable { was_output }
                }
            }
        }
    }

    fn running_into_existing_curved_belt(&self, belt: &Belt) -> bool {
        let pos_override = self.last_state.get_override_tuple(self.last_position);
        let is_output = self.last_state.last_belt_was_output();
        let connects_to_previous = self
            .world_view()
            .belt_directly_connects_to_previous(self.next_position(), pos_override);
        let belt_was_curved =
            self.world_view()
                .belt_was_curved(self.next_position(), belt, pos_override);

        is_output && connects_to_previous && belt_was_curved
    }

    fn aligned_belt_is_obstacle(&self, belt: &Belt) -> bool {
        let override_tuple = self.last_state.get_override_tuple(self.last_position);
        if self
            .world_view()
            .belt_was_curved(self.next_position(), belt, override_tuple)
        {
            // if the belt used to be curved, it's an obstacle.
            return true;
        }
        if !self.last_state.last_belt_was_output()
            && self
                .world_view()
                .belt_directly_connects_to_previous(self.next_position(), override_tuple)
        {
            // if we this belt directly connects to the previous one, and we didn't use the previous belt, then it's an obstacle.
            return true;
        }
        false
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
            TileType::Usable { was_output: false }
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

    fn should_ug_over_belt_segment_backwards_belt(&self) -> bool {
        note!("Curved belt segment handling");
        false
    }
}
