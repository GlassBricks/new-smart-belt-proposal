use crate::RelativeDirection::*;
use crate::belts::BeltTier;
use crate::belts::LoaderLike;
use crate::belts::Splitter;
use crate::belts::UndergroundBelt;
use crate::belts::{Belt, BeltConnectableEnum};

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
    /// An existing paired underground belt we will pass-through.
    PassThroughUnderground {
        /// failure if we wanted to upgrade this underground but we can't.
        upgrade_failure: bool,
        output_pos: i32,
    },
    /// An entity that ends the belt segment: a curved belt, or a loader. We can't underground over this.
    ImpassableObstacle,
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
        self.last_position + self.world_view.direction_multiplier()
    }

    fn is_forward(&self) -> bool {
        self.world_view.is_forward
    }

    /// most things are simple to classify. The tricky cases are in existing belt-like-entities.
    pub(super) fn classify_next_tile(&self) -> TileType {
        // note: we're faking impassable tiles with entities
        if let Some(entity) = self.world_view.get_entity(self.next_position()) {
            match entity.as_belt_connectable() {
                Some(BeltConnectableEnum::Belt(belt)) => self.classify_belt(belt),
                Some(BeltConnectableEnum::UndergroundBelt(ug)) => self.classify_underground(ug),
                Some(BeltConnectableEnum::Splitter(splitter)) => self.classify_splitter(splitter),
                Some(BeltConnectableEnum::LoaderLike(loader)) => self.classify_loader(loader),
                None => TileType::Obstacle,
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
        match self
            .world_view
            .belt_direction()
            .direction_to(belt.direction)
        {
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
            TileType::ImpassableObstacle
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
            .drag_direction()
            .direction_to(ug.shape_direction());

        match relative_dir {
            Left | Right => TileType::Obstacle,
            Forward | Backward => {
                let Some((pair_pos, _)) = self.world_view.get_ug_pair(self.next_position(), ug)
                else {
                    // unpaired undergrounds are always usable
                    return TileType::Usable;
                };
                if self.last_state.is_traversing_obstacle() {
                    // If the input of the underground is an obstacle, we can't use it
                    TileType::Obstacle
                } else if relative_dir == Backward {
                    // Backwards shape direction relative to drag direction is the "correct" orientation
                    self.try_integrate_underground(ug, pair_pos)
                } else {
                    TileType::Obstacle
                }
            }
        }
    }

    fn try_integrate_underground(&self, ug: &UndergroundBelt, pair_pos: i32) -> TileType {
        let upgrade_failure =
            self.tier != ug.tier && !self.can_upgrade_underground(self.next_position(), pair_pos);
        TileType::PassThroughUnderground {
            output_pos: pair_pos,
            upgrade_failure,
        }
    }

    fn classify_splitter(&self, splitter: &Splitter) -> TileType {
        if self
            .world_view
            .belt_direction()
            .direction_to(splitter.direction)
            == Forward
            && !self.should_ug_over_splitter_segment()
        {
            TileType::IntegratedSplitter
        } else {
            TileType::Obstacle
        }
    }

    fn classify_loader(&self, loader: &LoaderLike) -> TileType {
        if self.belt_connects_into_loader(loader) {
            TileType::ImpassableObstacle
        } else {
            TileType::Obstacle
        }
    }

    fn belt_connects_into_loader(&self, loader: &LoaderLike) -> bool {
        loader.shape_direction() == self.world_view.drag_direction().opposite()
            && loader.is_input == self.is_forward()
    }

    /// Check the belt segment.
    /// We ug over a backwards belt segment if:
    /// it consists only of straight backwards belt segments and underground belts, at least
    /// as far as the current underground might reach.
    fn should_ug_over_backwards_segment(&self) -> bool {
        // If we already integrated the last tile that connects to this one, continue to integrate.
        if self.last_state.is_outputting_belt()
            && self
                .world_view
                .belt_directly_connects_to_next(self.last_position)
        {
            return false;
        }

        self.scan_belt_segment(
            self.next_position(),
            true,
            |splitter| splitter.direction == self.world_view.belt_direction().opposite(),
            |loader| {
                loader.shape_direction() == self.world_view.drag_direction().opposite()
                    && loader.is_input != self.is_forward()
            },
        )
    }

    /// We currently only ug over a splitter if we see:
    /// splitter* (straight_belt*) curved_belt
    fn should_ug_over_splitter_segment(&self) -> bool {
        if matches!(self.last_state, NormalState::ErrorRecovery) {
            // Exception: you can always enter splitter from "error" state.
            // This allows e.g. starting a belt upgrade
            false
        } else if !self.last_state.is_outputting_belt() {
            // If we can't enter the splitter at all, treat it as an obstacle
            true
        } else if self.had_belt_entering_splitter() {
            // if we over-dragged a belt directly entering this splitter, always integrate.
            false
        } else {
            self.is_splitter_special_case()
        }
    }

    fn had_belt_entering_splitter(&self) -> bool {
        self.world_view
            .et_belt_dyn(self.last_position)
            .is_some_and(|b| {
                if self.world_view.is_forward {
                    b.has_output_going(self.world_view.belt_direction())
                } else {
                    b.has_input_going(self.world_view.belt_direction())
                }
            })
    }

    fn is_splitter_special_case(&self) -> bool {
        // Special case: splitter with no input, and the belt segment after it ends in a curved belt
        let max_underground_position = self
            .max_underground_position()
            .expect("Should be is_outputting_belt state");
        let rev_multiplier = self.world_view.direction_multiplier();

        let mut scan_pos = self.next_position();
        // Skip consecutive splitters
        while scan_pos * rev_multiplier < max_underground_position * rev_multiplier
            && let Some(belt_connectable) = self.world_view.get_belt(scan_pos)
            && let BeltConnectableEnum::Splitter(Splitter { direction, .. }) = belt_connectable
            && *direction == self.world_view.belt_direction()
        {
            scan_pos += rev_multiplier;
        }

        self.scan_belt_segment(scan_pos, false, |_| false, |_| false)
    }

    /// Scans belt segment, returns if we should underground over it.
    /// If the belt segment:
    /// - Ends in a curved belt, returns true.
    /// - Ends in a splitter/loader; then returns result of splitter_check and loader_check.
    /// Else, returns false.
    fn scan_belt_segment<FS, FL>(
        &self,
        start_pos: i32,
        reverse_belt_direction: bool,
        splitter_check: FS,
        loader_check: FL,
    ) -> bool
    where
        FS: Fn(&Splitter) -> bool,
        FL: Fn(&LoaderLike) -> bool,
    {
        let Some(max_underground_position) = self.max_underground_position() else {
            // if we can't underground at all, always integrate.
            return false;
        };

        let rev_multiplier = self.world_view.direction_multiplier();
        let mut scan_pos = start_pos;

        while scan_pos * rev_multiplier < max_underground_position * rev_multiplier
            && let Some(belt_connectable) = self.world_view.get_belt(scan_pos)
        {
            match belt_connectable {
                BeltConnectableEnum::Belt(belt) => {
                    // Check if this belt connects to the previous part of the belt segment.
                    let segment_connecting_dir =
                        if self.world_view.is_forward ^ reverse_belt_direction {
                            self.world_view.belt_input_direction(scan_pos, belt)
                        } else {
                            // output dir
                            belt.direction
                        };
                    let target_dir = if reverse_belt_direction {
                        self.world_view.belt_direction().opposite()
                    } else {
                        self.world_view.belt_direction()
                    };
                    if segment_connecting_dir != target_dir {
                        // Not part of this belt segment.
                        break;
                    }
                    if self.world_view.belt_was_curved(scan_pos, belt) {
                        // Curved belt case!
                        return true;
                    }
                }
                BeltConnectableEnum::UndergroundBelt(ug) => {
                    if ug.tier == self.tier {
                        // We can't underground over this.
                        break;
                    }
                    if ug.shape_direction() != self.world_view.drag_direction().opposite()
                        || ug.is_input != self.is_forward() ^ reverse_belt_direction
                    {
                        // Not part of belt segment.
                        break;
                    }
                    let Some((pair_pos, _)) = self.world_view.get_ug_pair(scan_pos, ug) else {
                        // Unpaired underground belt, treated as normal belt. Ends belt segment
                        break;
                    };
                    scan_pos = pair_pos;
                }
                BeltConnectableEnum::Splitter(splitter) => {
                    return splitter_check(splitter);
                }
                BeltConnectableEnum::LoaderLike(loader) => {
                    return loader_check(loader);
                }
            }
            scan_pos += rev_multiplier;
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
        let diff = (self.tier.underground_distance as i32) * self.world_view.direction_multiplier();
        input_pos.map(|f| f + diff)
    }

    /// Todo: this may be moved to drag_logic
    fn can_upgrade_underground(&self, ug_pos: i32, pair_pos: i32) -> bool {
        if pair_pos.abs_diff(ug_pos) > self.tier.underground_distance as u32 {
            // Can't upgrade if if upgrading would make the pair too short
            return false;
        }

        // Check if there are any existing underground belts in between that would cut this belt segment.
        let between_range = if self.is_forward() {
            ug_pos + 1..=pair_pos - 1
        } else {
            pair_pos + 1..=ug_pos - 1
        };

        !between_range.into_iter().any(|pos| {
            self.world_view
                .get_entity(pos)
                .and_then(|e| e.as_underground_belt())
                .is_some_and(|e| {
                    e.tier == self.tier
                        && e.direction.axis() == self.world_view.drag_direction().axis()
                })
        })
    }
}
