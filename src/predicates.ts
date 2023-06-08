import { CORP_STATIC } from "./corps.js";
import { GameStateDTO, PlayerDetailsDTO } from "./dto/game.js";
import { FIELD_CELL_STATIC, FieldContents } from "./field.js";
import { PlayerDetails } from "./game.js";
import { PROJECT_STATIC } from "./projects.js";

export function playableProjectPredicate(meIdx: number, game: GameStateDTO) {
    const me = game.players[meIdx];
    return (card) => {
        const projectStatic = PROJECT_STATIC[card.project];
        let cost = projectStatic.cost;

        let requirements = structuredClone(projectStatic.globalRequirements ?? {});

        const corpStatic = CORP_STATIC[me.corporation!];
        if (corpStatic.effects?.modifyProjectCost) {
            cost = corpStatic.effects.modifyProjectCost(cost, projectStatic);
        }
        if (corpStatic.effects?.modifyGlobalRequirements) {
            requirements = corpStatic.effects.modifyGlobalRequirements(requirements);
        }

        for (const { project } of me.board) {
            const ps = PROJECT_STATIC[project];
            if (ps.type === "active" && ps.subtype === "effect") {
                if (ps.effects.modifyProjectCost) {
                    cost = ps.effects.modifyProjectCost(cost, projectStatic);
                }
                if (ps.effects.modifyGlobalRequirements) {
                    requirements = ps.effects.modifyGlobalRequirements(requirements);
                }
            }
        }

        if (me.specialProject) {
            for (const requirement of Object.values(requirements)) {
                if (requirement.type === "min") requirement.amount -= 2;
                else requirement.amount += 2;
            }
        }

        let potentialCredits = me.resources!.credits.count;
        if (projectStatic.labels?.includes("building")) {
            potentialCredits += me.resources!.steel.count * 2;
        }
        if (projectStatic.labels?.includes("space")) {
            const titaniumCost = me.corporation === 3 ? 4 : 3;
            potentialCredits += me.resources!.titanium.count * titaniumCost;
        }
        if (me.corporation === 8) {
            potentialCredits += me.resources!.heat.count;
        }

        const oceanTilesPlaced = game.field.filter(c => c !== null && c.type === "ocean").length;
        let satisfied = true;
        for (const [p, req] of Object.entries(requirements)) {
            if (p === "temperature") {
                if (
                    req.type === "min" && game.temperature < req.amount ||
                    req.type === "max" && game.temperature > req.amount
                ) {
                    satisfied = false;
                    break;
                }
            } else if (p === "oxygen") {
                if (
                    req.type === "min" && game.oxygen < req.amount ||
                    req.type === "max" && game.oxygen > req.amount
                ) {
                    satisfied = false;
                    break;
                }
            } else if (p === "ocean") {
                if (
                    req.type === "min" && oceanTilesPlaced < req.amount ||
                    req.type === "max" && oceanTilesPlaced > req.amount
                ) {
                    satisfied = false;
                    break;
                }
            }
        }

        let canPlay = true;
        if (projectStatic.canPlay && !projectStatic.canPlay({ me: meIdx, players: game.players, field: game.field })) canPlay = false;

        return potentialCredits >= cost && satisfied && canPlay;
    };
}

export function standardCityPredicate(field: FieldContents) {
    return (pos: number) => {
        if (field[pos] !== null) return false;
        if (FIELD_CELL_STATIC[pos].ocean || FIELD_CELL_STATIC[pos].specialCity) return false;
        for (const np of FIELD_CELL_STATIC[pos].nc) {
            const fcc = field[np];
            if (fcc !== null && ["city", "capital"].includes(fcc.type)) return false;
        }
        return true;
    };
}

export function standardGreeneryPredicate(field: FieldContents, me: PlayerDetails | PlayerDetailsDTO) {
    let anyPlace = true;
    for (let p = 0; p < field.length; ++p) {
        const fcc = field[p];
        if (fcc !== null && fcc.type !== "ocean" && fcc.owner === me.idx) {
            for (const np of FIELD_CELL_STATIC[p].nc) {
                if (field[np] === null) {
                    anyPlace = false;
                    break;
                }
            }
            if (!anyPlace) break;
        }
    }

    if (anyPlace) return (pos: number) => {
        if (field[pos] !== null) return false;
        if (FIELD_CELL_STATIC[pos].ocean || FIELD_CELL_STATIC[pos].specialCity) return false;
        return true;
    };
    return (pos: number) => {
        if (field[pos] !== null) return false;
        if (FIELD_CELL_STATIC[pos].ocean || FIELD_CELL_STATIC[pos].specialCity) return false;
        for (const np of FIELD_CELL_STATIC[pos].nc) {
            const fcc = field[np];
            if (fcc !== null && fcc.type !== "ocean" && fcc.owner === me.idx) return true;
        }
        return false;
    };
}

export function standardOceanPredicate(field: FieldContents) {
    return (pos: number) => {
        if (field[pos] !== null) return false;
        if (FIELD_CELL_STATIC[pos].ocean) return true;
        return false;
    }
}
