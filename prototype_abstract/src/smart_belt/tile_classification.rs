use crate::RelativeDirection::*;
use crate::belts::BeltTier;
use crate::belts::LoaderLike;
use crate::belts::Splitter;
use crate::belts::UndergroundBelt;
use crate::belts::{Belt, BeltConnectableEnum};
use crate::not_yet_impl;

use super::DragWorldView;
use super::NormalState;

#[derive(Debug, Clone, PartialEq)]
pub(super) enum TileType {
    /// A tile we can place or fast-replace belt on.
    Usable,
    /// An obstacle we want to underground over.
    Obstacle,
    /// A splitter that we will use
    IntegratedSplitter,
    /// A curved belt we directly ran into, which is an impassable obstacle.
    ImpassableCurvedBelt,
    // An integrated splitter. Should not be replaced with underground belt.
    // IntegratedSplitter,
    /// An existing paired underground belt we will pass-through.
    PassThroughUnderground {
        /// failure if we want to upgrade this underground but we can't.
        upgrade_failure: bool,
        output_pos: i32,
    },
}

pub(super) struct TileClassifier<'a> {
    world_view: DragWorldView<'a>,
    tier: BeltTier,
    last_state: &'a NormalState,
    last_position: i32,
}

impl<'a> TileClassifier<'a> {
    pub(super) fn new(
        world_view: DragWorldView<'a>,
        tier: BeltTier,
        last_state: &'a NormalState,
        last_position: i32,
    ) -> Self {
        Self {
            world_view,
            tier,
            last_state,
            last_position,
        }
    }

    fn next_position(&self) -> i32 {
        self.last_position + 1
    }

    /// most things are simple to classify. The tricky cases are in existing belt-like-entities.
    pub(super) fn classify_next_tile(&self) -> TileType {
        let result = if let Some(entity) =
            self.world_view.get_entity_at_position(self.next_position())
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
        };
        dbg!(&result);
        result
    }

    fn classify_belt(&self, belt: &Belt) -> TileType {
        if self.world_view.belt_was_curved(self.next_position(), belt) {
            self.classify_curved_belt()
        } else {
            self.classify_straight_belt(belt)
        }
    }

    fn classify_straight_belt(&self, belt: &Belt) -> TileType {
        match self.world_view.relative_direction(belt.direction) {
            // perpendicular belt
            Left | Right => TileType::Obstacle,
            // if the previous tile is an obstacle and directly connects to this belt, it's an obstacle.
            Forward | Backward if self.aligned_belt_is_obstacle() => TileType::Obstacle,
            // Forwards straight belt is always usable!
            Forward => TileType::Usable,
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
                .world_view
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
                .world_view
                .belt_was_directly_connected_to_previous(self.next_position())
        // then this belt is also an obstacle.
    }

    fn classify_underground(&self, ug: &UndergroundBelt) -> TileType {
        let relative_dir = self
            .world_view
            .relative_direction(ug.shape_direction().opposite());

        match relative_dir {
            Left | Right => TileType::Obstacle,
            Forward | Backward => {
                let Some((pair_pos, _)) = self.world_view.get_ug_pair(self.next_position(), ug)
                else {
                    // unpaired undergrounds are always usable
                    return TileType::Usable;
                };
                if self.last_state.is_traversing_obstacle() {
                    // we can't use an input underground if we're already traversing an obstacle!
                    if ug.tier == self.tier {
                        // impassable!
                        todo!()
                    } else {
                        // can belt weave
                        TileType::Obstacle
                    }
                } else if relative_dir == Forward {
                    self.try_integrate_underground(ug, pair_pos)
                } else {
                    self.try_skip_underground(ug)
                }
            }
        }
    }

    fn try_integrate_underground(&self, ug: &UndergroundBelt, pair_pos: i32) -> TileType {
        let upgrade_failure = self.tier != ug.tier
            && !self.world_view.can_upgrade_underground(
                ug,
                self.next_position(),
                pair_pos,
                self.tier,
            );
        TileType::PassThroughUnderground {
            output_pos: pair_pos,
            upgrade_failure,
        }
    }

    fn try_skip_underground(&self, ug: &UndergroundBelt) -> TileType {
        if self.tier == ug.tier {
            todo!()
        } else {
            TileType::Obstacle
        }
    }

    fn classify_splitter(&self, splitter: &Splitter) -> TileType {
        if self.last_state.is_traversing_obstacle()
            || self.world_view.relative_direction(splitter.direction) != Forward
            || self.should_ug_over_splitter_segment(splitter)
        {
            // if we can't enter this splitter, it's an obstacle
            TileType::Obstacle
        } else {
            TileType::IntegratedSplitter
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
        // loader.is_input && loader.direction == self.world_view.drag_direction()
    }

    fn classify_empty_tile(&self) -> TileType {
        if self.world_view.can_place_belt_on_tile(self.next_position()) {
            TileType::Usable
        } else if self
            .world_view
            .is_undergroundable_tile(self.next_position())
        {
            todo!()
        } else {
            todo!()
        }
    }

    /// Check the belt segment.
    /// We ug over a backwards belt segment if:
    /// it consists only of straight backwards belt segments and underground belts, at least
    /// as far as the current underground might reach.
    fn should_ug_over_backwards_segment(&self) -> bool {
        // if we made the decision in the last tile, return that
        if self.last_state.is_outputting_belt()
            && self
                .world_view
                .belt_was_directly_connected_to_previous(self.next_position())
        {
            return false;
        }

        let Some(max_underground_position) = self.max_underground_position() else {
            // if we can't underground over it, default to including, it even if we may error.
            return false;
        };
        let backwards_dir = self.world_view.drag_direction().opposite();

        // iterate over belt segment, check for bad entities.
        // Only check up to _before_ the max underground position, to avoid long-distance
        // dependencies. If there is a bad entity _past_ the max underground position, we
        // can't underground over this anyways; so we just pick one error.
        for position in self.next_position()..max_underground_position {
            let Some(belt_connectable) = self
                .world_view
                .get_entity_at_position(position)
                .and_then(|f| f.as_belt_connectable())
            else {
                break;
            };
            match belt_connectable {
                BeltConnectableEnum::Belt(belt) => {
                    if belt.direction != backwards_dir {
                        not_yet_impl!("Forwards absolute direction, backwards relative direction");
                        break;
                    }
                    if self.world_view.belt_is_curved(position, belt) {
                        return true;
                    }
                }
                BeltConnectableEnum::UndergroundBelt(_) => todo!(),
                BeltConnectableEnum::Splitter(splitter) => {
                    // if the splitter is backwards, it connects to this belt segment, and makes
                    // the whole thing an obstacle
                    return splitter.direction == backwards_dir;
                }
                BeltConnectableEnum::LoaderLike(_) => todo!(),
            }
        }
        // default: integrate this belt segment
        false
    }

    /// We currently only ug over a splitter if we see:
    /// splitter* (straight_belt*) curved_belt
    fn should_ug_over_splitter_segment(&self, _splitter: &Splitter) -> bool {
        // if we can't underground over this at all, don't try
        let Some(max_underground_position) = self.max_underground_position() else {
            return false;
        };
        let belt_direction = self.world_view.drag_direction();

        let mut pos = self.next_position();
        let get_entity = |pos| {
            if pos >= max_underground_position {
                return None;
            }
            self.world_view
                .get_entity_at_position(pos)
                .and_then(|e| e.as_belt_connectable())
        };

        // Skip splitter*
        while let Some(entity) = get_entity(pos)
            && matches!(
                entity,
                BeltConnectableEnum::Splitter(Splitter { direction, .. })
                if *direction == belt_direction,
            )
        {
            pos += 1;
        }

        // Process remaining belt segment
        while let Some(entity) = get_entity(pos) {
            match entity {
                BeltConnectableEnum::Belt(belt) => {
                    if self.world_view.belt_is_curved(pos, belt) {
                        // curved belt: this segment is an obstacle if it's connected to this curved belt
                        return self.world_view.belt_was_directly_connected_to_previous(pos);
                    } else {
                        // straight belt
                        if belt.direction != self.world_view.drag_direction() {
                            // if not part of belt segment, break
                            break;
                        }
                        // else, continue scanning belt segment
                    }
                }
                BeltConnectableEnum::UndergroundBelt(ug) => {
                    if ug.shape_direction() != self.world_view.drag_direction().opposite() {
                        // not part of belt segment, break
                        break;
                    }
                    let Some((pair_pos, _)) = self.world_view.get_ug_pair(pos, ug) else {
                        // no pair, treated as normal belt -- ends belt segment
                        break;
                    };
                    if ug.tier == self.tier {
                        // we can't underground over this
                        break;
                    }
                    // scan after pair's output
                    pos = pair_pos;
                }
                BeltConnectableEnum::Splitter(_splitter) => {
                    break; // if we see another splitter, defer decision to until we reach it
                }
                BeltConnectableEnum::LoaderLike(_loader_like) => todo!(),
            }
            pos += 1;
        }
        false
    }

    fn max_underground_position(&self) -> Option<i32> {
        let input_pos = match self.last_state {
            NormalState::BeltPlaced => Some(self.last_position),
            NormalState::Traversing { input_pos, .. }
            | NormalState::OutputUgPlaced { input_pos, .. }
            | NormalState::TraversingAfterOutput { input_pos, .. } => Some(*input_pos),
            _ => None,
        };
        input_pos.map(|f| f + self.tier.underground_distance as i32)
    }
}
