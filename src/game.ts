import { ObjectId } from "mongodb";
import { BoardCard, ChatMessage, LabelsData, MilestonesData, ResourcesData } from "./dto/game.js";
import { FieldContents } from "./field.js";
import { AwardName } from "./string_types.js";
import { GameEvent } from "./events/game.js";

export type PlayerDetails = {
    idx: number,
    user: ObjectId,
    tr: number,
    trGain: number,
    corporation?: number,
    resources?: ResourcesData,
    labels: LabelsData,
    pass: boolean,
    offer?: number[],
    corpOffer?: number[],
    hand: number[],
    board: BoardCard[],
    played: number[],
    unmiGen?: number,
    specialProject?: boolean,
    firstAction?: boolean,
}

export type GameDoc = {
    players: PlayerDetails[],

    events: GameEvent[],
    messages: ChatMessage[],

    deck: number[],
    discard: number[],

    gen: number,
    phase: "research" | "action" | "finished",
    firstPlayer: number,
    turn?: number,
    actions?: number,

    oxygen: number,
    temperature: number,
    field: FieldContents,

    milestones: MilestonesData,
    awards: AwardName[],
    awardPrice?: number,
};

////////////////////////////////////////////////////////////////////////
