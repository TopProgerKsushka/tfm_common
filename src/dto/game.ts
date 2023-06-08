import type { FieldContents } from "../field.js";
import type { AwardName, CardResourceName, LabelName, MilestoneName, ResourceName } from "../string_types.js";
import type { UserDetailsDTO } from "./user.js";

type ResourceData = {
    count: number,
    production: number,
};

export type ResourcesData = Record<ResourceName, ResourceData>;
export type LabelsData = Record<LabelName, number>;
export type MilestonesData = Partial<Record<MilestoneName, number | undefined>>;
export type CardResourcesData = Partial<Record<CardResourceName, number>>;

export type BoardCard = {
    project: number,
    res: CardResourcesData,
    gen: number,
};

export type PlayerDetailsDTO = {
    idx: number,
    user: UserDetailsDTO,
    tr: number,
    trGain: number,
    corporation?: number,
    resources?: ResourcesData
    labels: LabelsData,
    pass: boolean,
    offer?: number[],
    corpOffer?: number[],
    hand?: number[],
    board: BoardCard[],
    unmiGen?: number,
    specialProject?: boolean,
    firstAction?: boolean,
};

export type ChatMessage = {
    author: number,
    text: string,
};

export type GameStateDTO = {
    id: string,
    players: PlayerDetailsDTO[],

    ei: number,

    messages: ChatMessage[],

    gen: number,
    phase: "research" | "action" | "finished",
    turn?: number,
    canPass?: boolean,

    oxygen: number,
    temperature: number,
    field: FieldContents,

    milestones: MilestonesData,
    awards: AwardName[],
    awardPrice?: number,
}

export type GameResults = {
    players: {
        idx: number,
        vp: number,
        eloGain: number,
    }[]
}
