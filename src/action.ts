import { AwardName, MilestoneName, ResourceName } from "./string_types.js";

type SimpleStandardProject = {
    standardProjectIdx: 1 | 2 | 3
};

type SellCardsStandardProject = {
    standardProjectIdx: 0,
    projects: number[],
};

type PlaceTileStandardProject = {
    standardProjectIdx: 4 | 5 | 6 | 7,
    pos: number,
};

export type StandardProjectAction = {
    type: "standard_project",
} & (
    | SimpleStandardProject
    | SellCardsStandardProject
    | PlaceTileStandardProject
);

type MilestoneAction = {
    type: "milestone",
    milestoneName: MilestoneName,
};

type AwardAction = {
    type: "award",
    awardName: AwardName,
};

export type PlayHandAction = {
    type: "play_hand",
    project: number,
    fee: Partial<Record<ResourceName, number> >,
    data: any,
};

export type DoProjectAction = {
    type: "do_prject_action",
    project: number,
    data: any,
};

type UnmiAction = {
    type: "unmi",
};

type InventrixAction = {
    type: "inventrix",
};

type TharsisRepublicAction = {
    type: "tharsis",
    pos: number,
};

export type Action =
    | StandardProjectAction
    | MilestoneAction
    | AwardAction
    | PlayHandAction
    | DoProjectAction
    | UnmiAction
    | InventrixAction
    | TharsisRepublicAction;