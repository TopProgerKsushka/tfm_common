import { ChatMessage, GameResults } from "../dto/game.js";
import { AwardName, MilestoneName } from "../string_types.js";

type PhaseChangeEvent = {
    type: "phase_changed",
    data: {
        phase: "research" | "action",
        turn: number,
    }
};

type GenerationChangeEvent = {
    type: "generation_changed",
    data: {
        gen: number,
    }
};

type TurnChangeEvent = {
    type: "turn_changed",
    data: {
        turn: number,
    }
};

type ActionSkipEvent = {
    type: "player_skipped_action",
    data: {
        player: number,
    }
};

type PassEvent = {
    type: "player_passed",
    data: {
        player: number,
    }
};

type StandardProjectEventData = {
    action: "standard_project",
    player: number,
    standardProjectIdx: number,
};

type MilestoneEventData = {
    action: "milestone",
    player: number,
    milestone: MilestoneName,
};

type AwardEventData = {
    action: "award",
    player: number,
    award: AwardName,
};

type HandPlayEventData = {
    action: "hand_play",
    player: number,
    project: number,
};

type ProjectActionEventData = {
    action: "project_action",
    player: number,
    project: number,
};

type UnmiActionEventData = {
    action: "unmi",
    player: number,
};

type InventrixActionEventData = {
    action: "inventrix",
    player: number,
};

type TharsisRepublicActionEventData = {
    action: "tharsis",
    player: number,
};

type ActionEventData =
    | StandardProjectEventData
    | MilestoneEventData
    | AwardEventData
    | HandPlayEventData
    | ProjectActionEventData
    | UnmiActionEventData
    | InventrixActionEventData
    | TharsisRepublicActionEventData;

type ActionEvent = {
    type: "action",
    data: ActionEventData,
};

type ChatMessageEvent = {
    type: "chat_message",
    data: ChatMessage,
};

type GameFinishEvent = {
    type: "game_finished",
    data: GameResults,
};

export type GameEvent =
    | PhaseChangeEvent
    | GenerationChangeEvent
    | TurnChangeEvent
    | ActionSkipEvent
    | PassEvent
    | ActionEvent
    | ChatMessageEvent
    | GameFinishEvent;