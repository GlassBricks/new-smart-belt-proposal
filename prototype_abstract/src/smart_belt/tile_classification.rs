use std::any::Any;

use crate::BeltConnectable;
use crate::Impassable;
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
    ImpassableObstacle(ObstacleKind),
    BlockingUnderground,
    /// An existing paired underground belt we ill pass-through.
    PassThroughUnderground {
        /// failure if we want to upgrade this underground but we can't.
        upgrade_failure: bool,
        output_pos: i32,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub enum ObstacleKind {
    CurvedBelt,
    Tile,
    Loader,
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

    fn is_forward(&self) -> bool {
        self.world_view.is_forward
    }

    fn next_position(&self) -> i32 {
        if self.is_forward() {
            self.last_position + 1
        } else {
            self.last_position - 1
        }
    }

    /// most things are simple to classify. The tricky cases are in existing belt-like-entities.
    pub(super) fn classify_next_tile(&self) -> TileType {
        // note: we're faking impassable tiles with entities
        if let Some(entity) = self.world_view.get_entity_at_position(self.next_position()) {
            match entity.as_belt_connectable() {
                Some(BeltConnectableEnum::Belt(belt)) => self.classify_belt(belt),
                Some(BeltConnectableEnum::UndergroundBelt(ug)) => self.classify_underground(ug),
                Some(BeltConnectableEnum::Splitter(splitter)) => self.classify_splitter(splitter),
                Some(BeltConnectableEnum::LoaderLike(loader)) => self.classify_loader(loader),
                None => {
                    if (entity as &dyn Any).is::<Impassable>() {
                        TileType::ImpassableObstacle(ObstacleKind::Tile)
                    } else {
                        TileType::Obstacle
                    }
                }
            }
        } else {
            TileType::Usable
        }
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
                .belt_directly_connects_to_next(self.last_position)
        {
            // it's impassable (smart belt is not allowed to rotate belt)
            TileType::ImpassableObstacle(ObstacleKind::CurvedBelt)
        } else {
            // Any other curved belt is a normal obstacle
            TileType::Obstacle
        }
    }

    fn aligned_belt_is_obstacle(&self) -> bool {
        // If we don't connect to this belt (obstacle or error)...
        !self.last_state.is_outputting_belt()
        // and this belt directly connects to the previous obstacle...
            && self
                .world_view
                .belt_directly_connects_to_next(self.last_position)
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
                        TileType::BlockingUnderground
                    } else {
                        // can belt weave
                        TileType::Obstacle
                    }
                } else if relative_dir == Forward {
                    // running into underground, use it!
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
            TileType::BlockingUnderground
        } else {
            TileType::Obstacle
        }
    }

    fn classify_splitter(&self, splitter: &Splitter) -> TileType {
        if self.world_view.relative_direction(splitter.direction) == Forward // same direction...
            && !self.last_state.is_traversing_obstacle() // can enter
            && !self.should_ug_over_splitter_segment(splitter)
        // not special splitter case
        {
            TileType::IntegratedSplitter
        } else {
            TileType::Obstacle
        }
    }

    fn classify_loader(&self, loader: &LoaderLike) -> TileType {
        if self.belt_connects_into_loader(loader) {
            TileType::ImpassableObstacle(ObstacleKind::Loader)
        } else {
            TileType::Obstacle
        }
    }

    fn belt_connects_into_loader(&self, loader: &LoaderLike) -> bool {
        not_yet_impl!("backwards dragging into loader");
        loader.shape_direction() == self.world_view.drag_direction().opposite() && loader.is_input
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
                .belt_directly_connects_to_next(self.last_position)
        {
            return false;
        }

        let Some(max_underground_position) = self.max_underground_position() else {
            // if we can't underground over it, default to including, it even if we may error.
            return false;
        };
        let backwards_dir = self.world_view.belt_direction().opposite();

        // iterate over belt segment, check for bad entities.
        // Only check up to _before_ the max underground position, to avoid long-distance
        // dependencies. If there is a bad entity _past_ the max underground position, we
        // can't underground over this anyways; so we just pick one error.
        let mut position = self.next_position();
        while position < max_underground_position {
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
                    if self.world_view.belt_was_curved(position, belt) {
                        return true;
                    }
                }
                BeltConnectableEnum::UndergroundBelt(ug) => {
                    if ug.shape_direction() != backwards_dir || !ug.has_output() {
                        // not part of belt segment
                        break;
                    }
                    let Some((pair_pos, _)) = self.world_view.get_ug_pair(position, ug) else {
                        // no pair, treated as normal belt. Ends belt segment
                        break;
                    };
                    if ug.tier == self.tier {
                        // Can't underground over belt of same tier
                        break;
                    }
                    // scan after pair's output
                    position = pair_pos;
                }
                BeltConnectableEnum::Splitter(splitter) => {
                    // if the splitter is backwards, it connects to this belt segment, and makes
                    // the whole thing an obstacle
                    return splitter.direction == backwards_dir;
                }
                BeltConnectableEnum::LoaderLike(_) => {
                    // end of belt segment
                    break;
                }
            }
            position += 1;
        }
        // default: integrate this belt segment
        false
    }

    fn last_output_already_exists(&self) -> bool {
        self.last_state.is_outputting_belt()
            && self
                .world_view
                .get_entity_at_position(self.last_position)
                .and_then(|e| e.as_belt_connectable_dyn())
                .is_some_and(|b| {
                    if self.world_view.is_forward {
                        b.has_output_going(self.world_view.belt_direction())
                    } else {
                        b.has_input_going(self.world_view.belt_direction())
                    }
                })
    }

    /// We currently only ug over a splitter if we see:
    /// splitter* (straight_belt*) curved_belt
    fn should_ug_over_splitter_segment(&self, _splitter: &Splitter) -> bool {
        // if the last tile directly connects to this splitter, don't try
        if self.last_output_already_exists() {
            return false;
        }

        // if we can't underground over this at all, don't try
        let Some(max_underground_position) = self.max_underground_position() else {
            return false;
        };
        let belt_direction = self.world_view.belt_direction();

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
                    if self.world_view.belt_was_curved(pos, belt) {
                        // curved belt: this segment is an obstacle if it's connected to this curved belt
                        return self.world_view.belt_directly_connects_to_next(pos - 1);
                    } else {
                        // straight belt
                        if belt.direction != self.world_view.belt_direction() {
                            // if not part of belt segment, break
                            break;
                        }
                        // else, continue scanning belt segment
                    }
                }
                BeltConnectableEnum::UndergroundBelt(ug) => {
                    if ug.shape_direction() != self.world_view.drag_direction().opposite()
                        || ug.is_input != self.is_forward()
                    {
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
                BeltConnectableEnum::LoaderLike(_loader_like) => {
                    break;
                }
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
        let diff = if self.world_view.is_forward {
            self.tier.underground_distance as i32
        } else {
            -(self.tier.underground_distance as i32)
        };
        input_pos.map(|f| f + diff)
    }
}
