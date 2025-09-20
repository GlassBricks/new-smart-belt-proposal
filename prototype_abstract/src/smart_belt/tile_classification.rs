use crate::Belt;
use crate::Entity;
use crate::LoaderLike;
use crate::RelativeDirection::*;
use crate::Splitter;
use crate::UndergroundBelt;

use super::LineDrag;

#[derive(Debug, Clone, PartialEq)]
pub enum TileType {
    /// A tile we can place or fast-replace belt on.
    Usable,
    /// An obstacle we want to underground over.
    Obstacle,
    // An obstacle that's impossible to underground past. Includes:
    // - Impassable tiles
    // - Curved belt
    // - An underground belt of the same tier we don't or can't integrate
    // Impassable,
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
            Left | Right => {
                todo!()
                // if self.belt_was_connected_forward(self.last_position) {
                //     TileType::Impassable
                // } else {
                //     TileType::Obstacle
                // }
            }
            Forward => {
                // if self.world_view().belt_was_curved(belt) {
                //     TileType::Obstacle
                // } else
                if self.last_state.is_outputting(self.last_position) {
                    // Running into belt in same direction.
                    TileType::Usable
                } else {
                    self.check_enter_belt_segment(belt)
                }
            }
            Backward => self.check_enter_belt_segment(belt),
        }
    }

    // fn belt_was_connected_forward(&self, _position: i32) -> bool {
    // todo: handle cases when a belt only used to be curved
    // true
    // }

    fn check_enter_belt_segment(&self, _belt: &Belt) -> TileType {
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
            Left | Right => TileType::Obstacle,
            Forward | Backward if !self.world_view().is_ug_paired(ug) => TileType::Usable,
            Forward => self.try_integrate_underground(ug),
            Backward => self.try_skip_underground(ug),
        }
    }

    fn try_integrate_underground(&self, ug: &UndergroundBelt) -> TileType {
        if self.tier != ug.tier && self.world_view().can_upgrade_underground(ug, &self.tier) {
            todo!()
            // TileType::UnupgradableUnderground
        } else {
            todo!()
            // TileType::PassThroughUnderground(self.tier)
        }
    }

    fn try_skip_underground(&self, ug: &UndergroundBelt) -> TileType {
        if self.tier == ug.tier {
            todo!()
            // TileType::Impassable
        } else {
            todo!()
            // TileType::Obstacle
        }
    }

    fn classify_splitter(&self, splitter: &Splitter) -> TileType {
        if matches!(
            self.world_view().relative_direction(splitter.direction),
            Forward
        ) && self.last_state.is_outputting(self.last_position)
            && self.should_ug_over_belt_segment_after_splitter()
        {
            todo!()
            // TileType::Obstacle
        } else {
            todo!()
            // TileType::IntegratedSplitter
        }
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
