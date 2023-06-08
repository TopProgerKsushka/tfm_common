type OceanTile = {
    type: "ocean",
};

type GreeneryTile = {
    type: "greenery",
    owner: number,
};

type CityTile = {
    type: "city",
    owner: number,
};

type CapitalTile = {
    type: "capital",
    owner: number,
};

type EcologicalZoneTile = {
    type: "ecological",
    owner: number,
};

type LavaFlowsTile = {
    type: "lava",
    owner: number,
};

type MiningTile = {
    type: "mining",
    owner: number,
};

type MoholeProjectTile = {
    type: "mohole",
    owner: number,
};

type NuclearZoneTile = {
    type: "nuclear",
    owner: number,
};

type PreserveAreaTile = {
    type: "preserve",
    owner: number,
};

export type Tile =
    | OceanTile
    | GreeneryTile
    | CityTile
    | CapitalTile
    | EcologicalZoneTile
    | LavaFlowsTile
    | MiningTile
    | MoholeProjectTile
    | NuclearZoneTile
    | PreserveAreaTile;