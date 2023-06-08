import { BoardCard, PlayerDetailsDTO } from "./dto/game.js";
import type { ParameterName, ResourceName, CardResourceName } from "./string_types.js";

type ResourceIcon = {
    type: "res",
    res: ResourceName | CardResourceName,
    production?: boolean,
    star?: boolean,
    count?: number,
};

type ParameterIcon = {
    type: "parameter",
    parameter: ParameterName,
};

type Icon = ResourceIcon | ParameterIcon | "arrow";

export type Choice = {
    result: string,
    picture?: Icon[],
    text: string,
};

export type DistributeResourcesInput = Partial<Omit<Record<ResourceName, number>, "credits" > >;
export type DistributeResourcesOutput = Partial<Record<ResourceName, number> >;

export type MakeChoiceClientFunction = (variants: Choice[]) => Promise<string>;
export type PlaceTileClientFunction = (tileName: string, predicate: (pos: number) => boolean) => Promise<number>;
export type NumberInRangeClientFunction = (question: string, min: number, max: number) => Promise<number>;
export type DistributeResourcesClientFunction = (price: number, res: DistributeResourcesInput) => Promise<DistributeResourcesOutput>;
export type SelectPlayerClientFunction = (question: string, predicate: (player: PlayerDetailsDTO) => boolean) => Promise<number>;
export type SelectBoardCardClientFunction = (question: string, anyPlayer: boolean, predicate: (project: BoardCard) => boolean) => Promise<number>;

export type ClientFunctions = {
    makeChoice: MakeChoiceClientFunction,
    placeTile: PlaceTileClientFunction,
    numberInRange: NumberInRangeClientFunction,
    distributeResources: DistributeResourcesClientFunction,
    selectPlayer: SelectPlayerClientFunction,
    selectBoardCard: SelectBoardCardClientFunction,
};
