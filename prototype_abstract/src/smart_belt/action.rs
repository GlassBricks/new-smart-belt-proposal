#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Action {
    PlaceBelt,
    PlaceNewUnderground { input_position: i32 },
    ReplaceUnderground { last_output_position: i32 },
    IntegrateEntity,
    None,
    // errors
    EntityInTheWay,
    ImpassableObstacle,
    TooLongToReach,
    CannotUpgradeUnderground,
}
