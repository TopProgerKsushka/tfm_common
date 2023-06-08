import { BoardCard } from "./dto/game.js";
import { GameDoc } from "./game.js";
import { GlobalRequirements, ProjectStatic } from "./projects.js";
import { Tile } from "./tiles.js";

type OnPlaceTileArg = {
    me: number,
    doc: GameDoc,
    thisCard?: BoardCard,

    tile: Tile,
    zoneIdx: number,
};

type OnPlayProjectCardArg = {
    me: number,
    doc: GameDoc,
    thisCard?: BoardCard,

    project: number,
    player: number,
};

export type Effects = {
    onPlaceTile?(arg: OnPlaceTileArg): void,
    onPlayProjectCard?(arg: OnPlayProjectCardArg): void,
    modifyGlobalRequirements?(req: GlobalRequirements): GlobalRequirements,
    modifyProjectCost?(cost: number, projectStatic: ProjectStatic): number,
};