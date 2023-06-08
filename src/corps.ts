import type { ResourcesData } from "./dto/game.js";
import { Effects } from "./effects.js";
import { FIELD_CELL_STATIC } from "./field.js";
import { GlobalRequirements, PROJECT_STATIC } from "./projects.js";
import type { LabelName } from "./string_types.js";

export type CorpStatic = {
    name: string,
    labels: LabelName[],
    res: ResourcesData,
    effects?: Effects,
};

export const CORP_STATIC: Record<number, CorpStatic> = {
    0: {
        name: "Mining Guild",
        labels: ["building", "building"],
        res: {
            credits: { count: 30, production: 0 },
            steel: { count: 5, production: 1 },
            titanium: { count: 0, production: 0 },
            plants: { count: 0, production: 0 },
            energy: { count: 0, production: 0 },
            heat: { count: 0, production: 0 },
        },
        effects: {
            onPlaceTile({ zoneIdx, me, doc }) {
                if ((FIELD_CELL_STATIC[zoneIdx].reward ?? []).some(r => ["steel", "titanium"].includes(r.res))) {
                    doc.players[me].resources!.steel.production += 1;
                }
            },
        },
    },
    1: {
        name: "Inventrix",
        labels: ["science"],
        res: {
            credits: { count: 45, production: 0 },
            steel: { count: 0, production: 0 },
            titanium: { count: 0, production: 0 },
            plants: { count: 0, production: 0 },
            energy: { count: 0, production: 0 },
            heat: { count: 0, production: 0 },
        },
        effects: {
            modifyGlobalRequirements(req) {
                const newReq = structuredClone(req) as GlobalRequirements;
                for (const requirement of Object.values(newReq)) {
                    if (requirement.type === "min") requirement.amount -= 2;
                    else requirement.amount += 2;
                }
                return newReq;
            },
        },
    },
    2: {
        name: "Thorgate",
        labels: ["energy"],
        res: {
            credits: { count: 48, production: 0 },
            steel: { count: 0, production: 0 },
            titanium: { count: 0, production: 0 },
            plants: { count: 0, production: 0 },
            energy: { count: 0, production: 1 },
            heat: { count: 0, production: 0 },
        },
        effects: {
            modifyProjectCost: (cost, projectStatic) => projectStatic.labels?.includes("energy") ? (cost - 3) : cost,
        },
    },
    3: {
        name: "Phobolog",
        labels: ["space"],
        res: {
            credits: { count: 23, production: 0 },
            steel: { count: 0, production: 0 },
            titanium: { count: 10, production: 0 },
            plants: { count: 0, production: 0 },
            energy: { count: 0, production: 0 },
            heat: { count: 0, production: 0 },
        },
    },
    4: {
        name: "Фарсидская республика",
        labels: ["building"],
        res: {
            credits: { count: 40, production: 0 },
            steel: { count: 0, production: 0 },
            titanium: { count: 0, production: 0 },
            plants: { count: 0, production: 0 },
            energy: { count: 0, production: 0 },
            heat: { count: 0, production: 0 },
        },
        effects: {
            onPlaceTile({ tile, me, doc }) {
                if (tile.type === "city") {
                    doc.players[me].resources!.credits.production += 1;
                    if (tile.owner === me) {
                        doc.players[me].resources!.credits.count += 3;
                    }
                }
            },
        },
    },
    5: {
        name: "Interplanetary Cinematics",
        labels: ["building"],
        res: {
            credits: { count: 30, production: 0 },
            steel: { count: 20, production: 0 },
            titanium: { count: 0, production: 0 },
            plants: { count: 0, production: 0 },
            energy: { count: 0, production: 0 },
            heat: { count: 0, production: 0 },
        },
        effects: {
            onPlayProjectCard({ project, me, doc, player }) {
                if (me === player && PROJECT_STATIC[project].type === "event") doc.players[me].resources!.credits.count += 2;
            }
        },
    },
    6: {
        name: "Ecoline",
        labels: ["plants"],
        res: {
            credits: { count: 36, production: 0 },
            steel: { count: 0, production: 0 },
            titanium: { count: 0, production: 0 },
            plants: { count: 3, production: 2 },
            energy: { count: 0, production: 0 },
            heat: { count: 0, production: 0 },
        },
    },
    7: {
        name: "United Nations Mars Initiative",
        labels: ["earth"],
        res: {
            credits: { count: 40, production: 0 },
            steel: { count: 0, production: 0 },
            titanium: { count: 0, production: 0 },
            plants: { count: 0, production: 0 },
            energy: { count: 0, production: 0 },
            heat: { count: 0, production: 0 },
        },
    },
    8: {
        name: "Helion",
        labels: ["space"],
        res: {
            credits: { count: 42, production: 0 },
            steel: { count: 0, production: 0 },
            titanium: { count: 0, production: 0 },
            plants: { count: 0, production: 0 },
            energy: { count: 0, production: 0 },
            heat: { count: 0, production: 3 },
        },
    },
    9: {
        name: "Credicor",
        labels: [],
        res: {
            credits: { count: 57, production: 0 },
            steel: { count: 0, production: 0 },
            titanium: { count: 0, production: 0 },
            plants: { count: 0, production: 0 },
            energy: { count: 0, production: 0 },
            heat: { count: 0, production: 0 },
        },
        effects: {
            onPlayProjectCard({ project, me, doc, player }) {
                if (player !== me) return;
                if (PROJECT_STATIC[project].cost >= 20) doc.players[me].resources!.credits.count += 4;
            }
        },
    },
};
