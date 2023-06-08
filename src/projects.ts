import { ClientFunctions, DistributeResourcesClientFunction, MakeChoiceClientFunction, NumberInRangeClientFunction, PlaceTileClientFunction, SelectBoardCardClientFunction, SelectPlayerClientFunction } from "./client_functions.js";
import type { BoardCard, CardResourcesData, PlayerDetailsDTO } from "./dto/game.js";
import { Effects } from "./effects.js";
import { FIELD_CELL_STATIC, FieldContents } from "./field.js";
import { GameDoc, PlayerDetails } from "./game.js";
import { standardCityPredicate, standardGreeneryPredicate, standardOceanPredicate } from "./predicates.js";
import { Tile } from "./tiles.js";
import type { GlobalParameterName, LabelName, ResourceName } from "./string_types.js";

type GlobalRequirement = { type: "min" | "max", amount: number };
export type GlobalRequirements = Partial<Record<GlobalParameterName, GlobalRequirement>>;

type CanDoActionArg = {
    players: (PlayerDetails | PlayerDetailsDTO)[],
    me: number,
    field: FieldContents,
};

type DoActionClientArg = {
    me: number,
    players: PlayerDetailsDTO[],
    field: FieldContents,
} & ClientFunctions;

type DoActionServerArg = {
    doc: GameDoc,
    me: number,
    placeTile(pos: number, tile: Tile): void,
    increaseGlobal(parameter: "oxygen" | "temperature", amount: number): void,
    gainTR(amount: number): void,
    validateFee(game: GameDoc, me: number, price: number, fee: Partial<Record<ResourceName, number> >, labels?: LabelName[], heatAllowed?: boolean): void,
    deckPop(count?: number): number[],
};

type VPArg = {
    me: PlayerDetails,
    field: FieldContents,
    cardResources?: CardResourcesData,
};

type EveryProjectCardStatic = {
    name: string,
    cost: number,
    labels?: LabelName[],
    globalRequirements?: GlobalRequirements,
    canPlay?(arg: CanDoActionArg): boolean,
    playClient?(arg: DoActionClientArg): Promise<any>,
    playServer?(arg: DoActionServerArg, input: any): void,
    vp?(arg: VPArg): number,
};

type EventCardStatic = {
    type: "event",
};

type AutomatedCardStatic = {
    type: "automated",
}

type ActionCardStatic = {
    subtype: "action",
    canDoAction?(arg: CanDoActionArg): boolean,
    doActionClient?(arg: DoActionClientArg): Promise<any>,
    doActionServer?(arg: DoActionServerArg, input: any): void,
};

type EffectCardStatic = {
    subtype: "effect",
    effects: Effects,
};

type ActiveCardStatic = {
    type: "active",
    disallowResourceDecrease?: boolean,
    initialResources?: CardResourcesData,
} & (ActionCardStatic | EffectCardStatic);

export type ProjectStatic = EveryProjectCardStatic & (
    | EventCardStatic
    | ActiveCardStatic
    | AutomatedCardStatic
);

/**
 * Эту ошибку следует выбрасывать в функциях playServer и doActionServer, если что-то идёт не так,
 * например передан ошибочный input.
 */
export class ProjectPlayError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = "ProjectPlayError";
    }
}

export const PROJECT_STATIC: Record<number, ProjectStatic> = {
    1: {
        type: "automated",
        name: "Учебных лагерь",
        labels: ["jupiter", "building"],
        cost: 8,
        globalRequirements: { "oxygen": { type: "max", amount: 5 } },

        vp: () => 2,
    },

    3: {
        type: "automated",
        name: "Тепло глубин",
        labels: ["energy", "building"],
        cost: 13,

        playServer({ doc, me, increaseGlobal }) {
            doc.players[me].resources!.energy.production += 1;
            increaseGlobal("temperature", 1);
        }
    },

    4: {
        type: "automated",
        name: "Засев облаков",
        cost: 11,
        globalRequirements: { ocean: { type: "min", amount: 3 } },

        canPlay: ({ me, players }) => players.some(p => p.resources!.heat.production >= 1) && players[me].resources!.credits.production >= -4,

        async playClient({ me, players, selectPlayer }) {
            const player = players.some(p => p.idx !== me && p.resources!.heat.production >= 1)
                ? await selectPlayer("Выберите игрока, чеё производство тепла хотите уменьшить", p => p.resources!.heat.production >= 1)
                : me;
            return {
                player
            };
        },

        playServer({ doc, me }, { player }) {
            doc.players[me].resources!.credits.production -= 1;
            doc.players[player].resources!.heat.production -= 1;
            doc.players[me].resources!.plants.production += 2;
        },
    },

    5: {
        type: "active",
        subtype: "action",
        name: "Поиски жизни",
        labels: ["science"],
        cost: 3,
        globalRequirements: { "oxygen": { type: "max", amount: 6 } },

        canDoAction: ({ me, players }) => players[me].resources!.credits.count >= 1,

        doActionServer({ doc, me, deckPop }) {
            // let nextProject: number;
            // if (doc.deck.length > 0) nextProject = doc.deck.pop()!;
            // else {
            //     const i = Math.floor(Math.random() * doc.discard.length);
            //     nextProject = doc.discard.splice(i, 1)[0];
            // }
            const [nextProject] = deckPop();

            if ((PROJECT_STATIC[nextProject].labels ?? []).includes("microbes")) {
                const res = doc.players[me].board.find(bc => bc.project === 5)!.res;
                res.science = (res.science ?? 0) + 1;
            }

            doc.discard.push(nextProject);
        },

        vp: ({ cardResources }) => (cardResources!.science ?? 0) > 0 ? 3 : 0,
    },

    7: {
        type: "active",
        subtype: "action",
        name: "Железная дорога",
        labels: [ "building" ],
        cost: 13,

        canDoAction: ({ me, players }) => players[me].resources!.energy.count >= 1,
        doActionServer({ doc, me }) {
            for (const tile of doc.field.slice(2)) {
                if (tile !== null && ["city", "capital"].includes(tile.type)) {
                    doc.players[me].resources!.credits.count += 1;
                }
            }
        }
    },

    8: {
        type: "automated",
        name: "Столица",
        labels: ["city", "building"],
        cost: 26,
        globalRequirements: { "ocean": { type: "min", amount: 4 } },
        
        canPlay: ({ me, players }) => players[me].resources!.energy.production >= 2,
        async playClient({ placeTile, field }) {
            return {
                pos: await placeTile("жетон столицы", standardCityPredicate(field))
            }
        },
        playServer({ doc, me, placeTile }, { pos }) {
            doc.players[me].resources!.energy.production -= 2;
            doc.players[me].resources!.credits.production += 5;
            placeTile(pos, {
                type: "capital",
                owner: me
            });
        },

        vp({ field }) {
            let pos: number | undefined;
            for (let i = 0; i < field.length; ++i) {
                const tile = field[i];
                if (tile !== null && tile.type === "capital") {
                    pos = i;
                    break;
                }
            }
            let vp = 0;
            if (pos !== undefined) {
                for (const nc of FIELD_CELL_STATIC[pos].nc) {
                    const fcc = field[nc];
                    if (fcc !== null && fcc.type === "ocean") {
                        vp += 1;
                    }
                }
            }
            return vp;
        }
    },

    9: {
        type: "event",
        name: "Астероид",
        labels: [ "space" ],
        cost: 14,

        async playClient({ selectPlayer }) {
            return {
                player: await selectPlayer("Выберите игрока, чьи 3 растения хотите уничтожить", () => true),
            };
        },
        playServer({ doc, me, increaseGlobal }, { player }) {
            doc.players[player].resources!.plants.count -= 3;
            if (doc.players[player].resources!.plants.count < 0) doc.players[player].resources!.plants.count = 0;
            doc.players[me].resources!.titanium.count += 2;
            increaseGlobal("temperature", 1);
        }
    },

    10: {
        type: "event",
        name: "Комета",
        labels: [ "space" ],
        cost: 21,

        async playClient({ placeTile, selectPlayer, field }) {
            const oceanTilesPlaced = field.filter(t => t !== null && t.type === "ocean").length;
            return {
                ...(oceanTilesPlaced < 9 && { pos: await placeTile("жетон океана", standardOceanPredicate(field)) }),
                player: await selectPlayer("Выберите игрока, чьи 3 растения хотите уничтожить", () => true),
            };
        },
        playServer({ placeTile, increaseGlobal, doc }, { pos, player }) {
            doc.players[player].resources!.plants.count -= 3;
            if (doc.players[player].resources!.plants.count < 0) doc.players[player].resources!.plants.count = 0;
            placeTile(pos, { type: "ocean" });
            increaseGlobal("temperature", 1);
        }
    },

    11: {
        type: "event",
        name: "Большой астероид",
        labels: [ "space" ],
        cost: 27,

        async playClient({ selectPlayer }) {
            return {
                player: await selectPlayer("Выберите игрока, чьи 4 растения хотите уничтожить", () => true),
            };
        },
        playServer({ doc, me, increaseGlobal }, { player }) {
            doc.players[player].resources!.plants.count -= 4;
            if (doc.players[player].resources!.plants.count < 0) doc.players[player].resources!.plants.count = 0;
            doc.players[me].resources!.titanium.count += 4;
            increaseGlobal("temperature", 2);
        }
    },

    12: {
        type: "active",
        subtype: "action",
        name: "Вода с Европы",
        labels: [ "jupiter", "space" ],
        cost: 25,

        canDoAction({ field, players, me }) {
            const oceanTilesPlaced = field.filter(t => t !== null && t.type === "ocean").length;
            const titaniumCost = players[me].corporation === 3 ? 4 : 3;
            const potentialCredits = players[me].resources!.credits.count + players[me].resources!.titanium.count * titaniumCost;
            return potentialCredits >= 12 && oceanTilesPlaced < 9;
        },
        async doActionClient({ players, me, field, distributeResources, placeTile }) {
            const titaniumCost = players[me].corporation === 3 ? 4 : 3;
            return {
                fee: await distributeResources(12, { titanium: titaniumCost }),
                pos: await placeTile("жетон океана", standardOceanPredicate(field)),
            };
        },
        doActionServer({ placeTile, validateFee, doc, me }, { fee, pos }) {
            const oceanTilesPlaced = doc.field.filter(t => t !== null && t.type === "ocean").length;
            if (oceanTilesPlaced >= 9) throw new ProjectPlayError("can't play this card when 9 ocean tiles already placed");
            if (doc.field[pos] !== null) throw new ProjectPlayError("this cell is occupid");
            validateFee(doc, me, 12, fee, ["space"], false);
            for (const [name, val] of Object.entries(fee) as [ResourceName, number][]) {
                doc.players[me].resources![name].count -= val;
            }
            placeTile(pos, { type: "ocean" });
        },

        vp: ({ me }) => me.labels.jupiter,
    },

    16: {
        type: "automated",
        name: "Крытый кратер",
        labels: ["city", "building"],
        cost: 24,
        globalRequirements: { "temperature": { type: "max", amount: 7 } },

        canPlay: ({ players, me }) => (players[me].resources?.energy.count ?? 0) > 0,

        async playClient({ placeTile, field }) {
            return { pos: await placeTile("жетон города", standardCityPredicate(field)) };
        },

        playServer({ me, placeTile }, { pos }) {
            placeTile(pos, {
                type: "city",
                owner: me,
            });
        },

        vp: () => 1,
    },

    17: {
        type: "automated",
        name: "Ноктис-Сити",
        labels: [ "city", "building" ],
        cost: 18,

        canPlay: ({ players, me }) => players[me].resources!.energy.production >= 1,
        playServer({ doc, me, placeTile }) {
            doc.players[me].resources!.energy.production -= 1;
            doc.players[me].resources!.credits.production += 3;
            placeTile(30, {
                type: "city",
                owner: me,
            });
        }
    },

    18: {
        type: "automated",
        name: "Метан с Титана",
        labels: [ "jupiter", "space" ],
        cost: 28,
        globalRequirements: { oxygen: { type: "min", amount: 2 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.heat.production += 2;
            doc.players[me].resources!.plants.production += 2;
        },

        vp: () => 2,
    },

    19: {
        type: "event",
        name: "Ввоз водорода",
        labels: ["earth", "space"],
        cost: 16,
        
        async playClient({ makeChoice, placeTile, selectBoardCard, field }) {
            const choice = await makeChoice([
                {
                    result: "plants",
                    text: "получить 3 растения",
                    picture: [{
                        type: "res",
                        res: "plants",
                        count: 3,
                    }],
                },
                {
                    result: "microbes",
                    text: "добавить 3 микробов на другую карту",
                    picture: [{
                        type: "res",
                        res: "microbes",
                        count: 3,
                        star: true,
                    }]
                },
                {
                    result: "animals",
                    text: "добавить 2 животных на другую карту",
                    picture: [{
                        type: "res",
                        res: "animals",
                        count: 2,
                        star: true,
                    }]
                }
            ]);
            const oceanTilesPlaced = field.filter(t => t !== null && t.type === "ocean").length;
            if (["microbes", "animals"].includes(choice)) {
                const question = "Выберите карту, на которую хотите добавить " + choice === "microbes" ? "микробов" : "животных";
                return {
                    choice,
                    otherCard: await selectBoardCard(question, false, bc => (PROJECT_STATIC[bc.project].labels ?? []).includes(choice as LabelName)),
                    ...(oceanTilesPlaced < 9 && { pos: await placeTile("жетон океана", standardOceanPredicate(field)) }),
                };
            } else {
                return {
                    choice,
                    ...(oceanTilesPlaced < 9 && { pos: await placeTile("жетон океана", standardOceanPredicate(field)) }),
                };
            }
        },

        playServer({ doc, me, placeTile }, { choice, otherCard, pos }) {
            if (choice === "plants") {
                doc.players[me].resources!.plants.count += 3;
            } else if (choice === "microbes") {
                const card = doc.players[me].board.find(bc => bc.project === otherCard)!;
                card.res.microbes = (card.res.microbes ?? 0) + 3;
            } else if (choice === "animals") {
                const card = doc.players[me].board.find(bc => bc.project === otherCard)!;
                card.res.animals = (card.res.animals ?? 0) + 2;
            }
            placeTile(pos, { type: "ocean" });
        }
    },

    20: {
        type: "active",
        subtype: "effect",
        name: "Научная база",
        labels: [ "science", "city", "building" ],
        cost: 18,
        
        effects: {
            modifyProjectCost: (cost) => cost - 1,
        },

        canPlay({ field }) {
            for (const fcs of Object.values(FIELD_CELL_STATIC)) {
                if (fcs.ocean) continue;
                if (fcs.specialCity) continue;
                let noTilesNear = true;
                for (const nc of fcs.nc) {
                    if (field[nc] !== null) {
                        noTilesNear = false;
                        break;
                    }
                }
                if (noTilesNear) return true;
            }
            return false;
        },

        async playClient({ field, placeTile }) {
            return {
                pos: await placeTile("жетон города не по соседству ни с каким другим жетоном", (pos) => {
                    const fcs = FIELD_CELL_STATIC[pos];
                    if (fcs.ocean) return false;
                    if (fcs.specialCity) return false;
                    for (const nc of fcs.nc) {
                        if (field[nc] !== null) return false;
                    }
                    return true;
                })
            };
        },
        playServer({ me, placeTile }, { pos }) {
            placeTile(pos, {
                type: "city",
                owner: me
            });
        }
    },

    21: {
        type: "automated",
        name: "Космопорт на Фобосе",
        labels: [ "space", "city" ],
        cost: 25,

        playServer({ doc, me, placeTile }) {
            doc.players[me].resources!.titanium.production += 1;
            placeTile(0, {
                type: "city",
                owner: me
            });
        },

        vp: () => 3,
    },

    22: {
        type: "automated",
        name: "Полярная чёрная пыль",
        cost: 15,
        
        canPlay: ({ players, me }) => (players[me].resources?.credits.production ?? -5) >= -3,

        async playClient({ placeTile, field }) {
            const oceanTilesPlaced = field.filter(t => t !== null && t.type === "ocean").length;
            return {
                ...(oceanTilesPlaced < 9 && { pos: await placeTile("жетон океана", standardOceanPredicate(field)) }),
            }
        },

        playServer({ doc, me, placeTile }, { pos }) {
            doc.players[me].resources!.credits.production -= 2;
            doc.players[me].resources!.heat.production += 3;
            placeTile(pos, { type: "ocean" });
        },
    },

    23: {
        type: "active",
        subtype: "effect",
        name: "Полярные водоросли",
        labels: [ "plants" ],
        cost: 12,
        globalRequirements: { temperature: { type: "max", amount: -12 } },

        effects: {
            onPlaceTile({ tile, doc, me }) {
                if (tile.type === "ocean") {
                    doc.players[me].resources!.plants.count += 2;
                }
            }
        },

        playServer({ doc, me }) {
            doc.players[me].resources!.plants.count += 1;
        }
    },

    24: {
        type: "active",
        subtype: "action",
        name: "Хищники",
        labels: [ "animals" ],
        cost: 14,
        globalRequirements: { oxygen: { type: "min", amount: 11 } },

        canDoAction({ players }) {
            for (const player of players) {
                for (const bc of player.board) {
                    const ps = PROJECT_STATIC[bc.project];
                    if (bc.project !== 24 && (bc.res.animals ?? 0) > 0 && ps.type === "active" && !ps.disallowResourceDecrease) return true;
                }
            }
            return false;
        },

        async doActionClient({ selectBoardCard }) {
            return {
                from: await selectBoardCard(
                    "Выберите карту, с которой хотите убрать животное",
                    true,
                    (bc) => {
                        const ps = PROJECT_STATIC[bc.project];
                        return bc.project !== 24 && (bc.res.animals ?? 0) > 0 && ps.type === "active" && !ps.disallowResourceDecrease;
                    }
                )
            };
        },

        doActionServer({ doc, me }, { from }) {
            let boardCard: BoardCard | undefined;
            for (const player of doc.players) {
                for (const bc of player.board) {
                    const ps = PROJECT_STATIC[bc.project];
                    if (bc.project === from && bc.project !== 24 && (bc.res.animals ?? 0) > 0 && ps.type === "active" && !ps.disallowResourceDecrease) {
                        boardCard = bc;
                        break;
                    }
                }
            }
            if (!boardCard) throw new ProjectPlayError("card not found");
            boardCard.res.animals! -= 1;
            const thisCard = doc.players[me].board.find(bc => bc.project === 24)!;
            thisCard.res.animals = (thisCard.res.animals ?? 0) + 1;
        },

        vp: ({ cardResources }) => cardResources!.animals ?? 0,
    },

    26: {
        type: "automated",
        name: "Заповедник каньона Эос",
        labels: [ "plants", "building" ],
        cost: 16,
        globalRequirements: { temperature: { type: "min", amount: -12 } },
        
        canPlay({ players, me }) {
            for (const bc of players[me].board) {
                if ((PROJECT_STATIC[bc.project].labels ?? []).includes("animals")) return true;
            }
            return false;
        },
        async playClient({ selectBoardCard }) {
            return {
                to: await selectBoardCard(
                    "Выберите карту, на которую хотите добавить животное",
                    false,
                    (bc) => (PROJECT_STATIC[bc.project].labels ?? []).includes("animals")
                )
            }
        },
        playServer({ doc, me }, { to }) {
            const bc = doc.players[me].board.find(bc => bc.project === to);
            if (!bc) throw new ProjectPlayError("you don't have this card on board");
            if (!(PROJECT_STATIC[bc.project].labels ?? []).includes("animals")) throw new ProjectPlayError("this card dones't have animals label");
            bc.res.animals = (bc.res.animals ?? 0) + 1;
            doc.players[me].resources!.plants.count += 3;
            doc.players[me].resources!.credits.production += 2;
        },

        vp: () => 1,
    },

    29: {
        type: "automated",
        name: "Город под куполом",
        labels: [ "city", "building" ],
        cost: 16,
        globalRequirements: { oxygen: { type: "max", amount: 9 } },

        canPlay: ({ players, me }) => players[me].resources!.energy.production >= 1,
        async playClient({ field, placeTile }) {
            return {
                pos: await placeTile("жетон города", standardCityPredicate(field))
            };
        },
        playServer({ doc, me, placeTile }, { pos }) {
            placeTile(pos, {
                type: "city",
                owner: me
            });
            doc.players[me].resources!.energy.production -= 1;
            doc.players[me].resources!.credits.production += 3;
        }
    },

    30: {
        type: "automated",
        name: "Луч с луны",
        labels: [ "earth", "energy" ],
        cost: 13,

        canPlay: ({ players, me }) => players[me].resources!.credits.production >= -3,
        playServer({ doc, me }) {
            doc.players[me].resources!.credits.production -= 2;
            doc.players[me].resources!.heat.production += 2;
            doc.players[me].resources!.energy.production += 2;
        }
    },

    31: {
        type: "active",
        subtype: "effect",
        name: "Аэроторможение",
        labels: [ "space" ],
        cost: 7,

        effects: {
            onPlayProjectCard({ doc, me, player, project }) {
                const ps = PROJECT_STATIC[project];
                if (player === me && ps.type === "event" && (ps.labels ?? []).includes("space")) {
                    doc.players[me].resources!.credits.count += 3;
                    doc.players[me].resources!.heat.count += 3;
                }
            }
        }
    },

    32: {
        type: "automated",
        name: "Подземный город",
        labels: [ "city", "building" ],
        cost: 18,

        canPlay: ({ players, me }) => players[me].resources!.energy.production >= 2,

        async playClient({ field, placeTile }) {
            return {
                pos: await placeTile("жетон города", standardCityPredicate(field)),
            }
        },
        playServer({ doc, me, placeTile }, { pos }) {
            placeTile(pos, {
                type: "city",
                owner: me,
            });
            doc.players[me].resources!.energy.production -= 2;
            doc.players[me].resources!.steel.production += 2;
        }
    },

    33: {
        type: "active",
        subtype: "action",
        name: "Поедатели реголита",
        labels: [ "science", "microbes" ],
        cost: 13,

        async doActionClient({ makeChoice, players, me }) {
            const bc = players[me].board.find(bc => bc.project === 33)!;
            if ((bc.res.microbes ?? 0) < 2) return { choice: "add" };
            else {
                return {
                    choice: await makeChoice([
                        {
                            result: "add",
                            picture: [{ type: "res", res: "microbes" }],
                            text: "добавить 1 микроба на эту карту",
                        },
                        {
                            result: "oxygen",
                            picture: [{ type: "res", res: "microbes", count: 2 }, "arrow", { type: "parameter", parameter: "oxygen" }],
                            text: "повысить уровень кислорода на 1% за 2 микробов",
                        }
                    ])
                };
            }
        },
        doActionServer({ doc, me, increaseGlobal }, { choice }) {
            const bc = doc.players[me].board.find(bc => bc.project === 33)!;
            if (choice === "add") {
                bc.res.microbes = (bc.res.microbes ?? 0) + 1;
            } else if (choice === "oxygen") {
                if ((bc.res.microbes ?? 0) < 2) throw new ProjectPlayError("not enough microbes");
                bc.res.microbes! -= 2;
                increaseGlobal("oxygen", 1);
            } else {
                throw new ProjectPlayError(`unknown choice: ${choice}`);
            }
        }
    },

    34: {
        type: "active",
        subtype: "action",
        name: "Метаногены",
        labels: [ "science", "microbes" ],
        cost: 8,
        globalRequirements: { oxygen: { type: "min", amount: 4 } },

        async doActionClient({ makeChoice, players, me }) {
            const bc = players[me].board.find(bc => bc.project === 34)!;
            if ((bc.res.microbes ?? 0) < 2) return { choice: "add" };
            else {
                return {
                    choice: await makeChoice([
                        {
                            result: "add",
                            picture: [{ type: "res", res: "microbes" }],
                            text: "добавить 1 микроба на эту карту",
                        },
                        {
                            result: "temperature",
                            picture: [{ type: "res", res: "microbes", count: 2 }, "arrow", { type: "parameter", parameter: "temperature" }],
                            text: "повысить температуру на 1⁰ за 2 микробов",
                        }
                    ])
                };
            }
        },
        doActionServer({ doc, me, increaseGlobal }, { choice }) {
            const bc = doc.players[me].board.find(bc => bc.project === 34)!;
            if (choice === "add") {
                bc.res.microbes = (bc.res.microbes ?? 0) + 1;
            } else if (choice === "temperature") {
                if ((bc.res.microbes ?? 0) < 2) throw new ProjectPlayError("not enough microbes");
                bc.res.microbes! -= 2;
                increaseGlobal("temperature", 1);
            } else {
                throw new ProjectPlayError(`unknown choice: ${choice}`);
            }
        }
    },

    35: {
        type: "active",
        subtype: "action",
        name: "Муравьи",
        labels: [ "microbes" ],
        cost: 9,
        globalRequirements: { oxygen: { type: "min", amount: 4 } },

        canDoAction({ players }) {
            for (const player of players) {
                for (const bc of player.board) {
                    const ps = PROJECT_STATIC[bc.project];
                    if (bc.project !== 35 && (bc.res.microbes ?? 0) > 0 && ps.type === "active" && !ps.disallowResourceDecrease) return true;
                }
            }
            return false;
        },

        async doActionClient({ selectBoardCard }) {
            return {
                from: await selectBoardCard(
                    "Выберите карту, с которой хотите убрать микроба",
                    true,
                    (bc) => {
                        const ps = PROJECT_STATIC[bc.project];
                        return bc.project !== 35 && (bc.res.microbes ?? 0) > 0 && ps.type === "active" && !ps.disallowResourceDecrease;
                    }
                )
            };
        },

        doActionServer({ doc, me }, { from }) {
            let boardCard: BoardCard | undefined;
            for (const player of doc.players) {
                for (const bc of player.board) {
                    const ps = PROJECT_STATIC[bc.project];
                    if (bc.project === from && bc.project !== 35 && (bc.res.microbes ?? 0) > 0 && ps.type === "active" && !ps.disallowResourceDecrease) {
                        boardCard = bc;
                        break;
                    }
                }
            }
            if (!boardCard) throw new ProjectPlayError("card not found");
            boardCard.res.microbes! -= 1;
            const thisCard = doc.players[me].board.find(bc => bc.project === 35)!;
            thisCard.res.microbes = (thisCard.res.microbes ?? 0) + 1;
        },

        vp: ({ cardResources }) => Math.floor((cardResources!.microbes ?? 0) / 2),
    },

    36: {
        type: "event",
        name: "Выпуск инертных газов",
        cost: 14,

        playServer({ gainTR }) {
            gainTR(2);
        }
    },

    37: {
        type: "event",
        name: "Богатый азотом астероид",
        labels: [ "space" ],
        cost: 31,

        playServer({ doc, me, gainTR, increaseGlobal }) {
            gainTR(2);
            increaseGlobal("temperature", 1);
            doc.players[me].resources!.plants.production +=
                doc.players[me].labels.plants >= 3
                ? 4
                : 1;
        }
    },

    38: {
        type: "active",
        subtype: "effect",
        name: "Создание вездехода",
        labels: [ "building" ],
        cost: 8,

        effects: {
            onPlaceTile({ tile, doc, me }) {
                if (tile.type === "city" || tile.type === "capital") {
                    doc.players[me].resources!.credits.count += 2;
                }
            },
        },

        vp: () => 1,
    },

    39: {
        type: "event",
        name: "Обрушение Деймоса",
        labels: [ "space" ],
        cost: 31,

        async playClient({ selectPlayer }) {
            return {
                player: await selectPlayer(
                    "Выберите игрока, чьи 8 растений хотите уничтожить",
                    () => true,
                ),
            };
        },
        playServer({ doc, me, increaseGlobal } , { player }) {
            doc.players[player].resources!.plants.count -= 8;
            if (doc.players[player].resources!.plants.count < 0) doc.players[player].resources!.plants.count = 0;
            increaseGlobal("temperature", 3);
            doc.players[me].resources!.steel.count += 4;
        }
    },

    40: {
        type: "automated",
        name: "Бурение астероидов",
        labels: [ "jupiter", "space" ],
        cost: 30,

        playServer({ doc, me }) {
            doc.players[me].resources!.titanium.production += 2;
        },

        vp: () => 2,
    },

    41: {
        type: "automated",
        name: "Производство еды",
        labels: [ "building" ],
        cost: 12,

        canPlay: ({ players, me }) => players[me].resources!.plants.production >= 1,

        playServer({ doc, me }) {
            doc.players[me].resources!.plants.production -= 1;
            doc.players[me].resources!.credits.production += 4;
        },

        vp: () => 1,
    },

    42: {
        type: "automated",
        name: "Архебактерии",
        labels: [ "microbes" ],
        cost: 6,
        globalRequirements: { temperature: { type: "max", amount: -18 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.plants.production += 1;
        }
    },

    43: {
        type: "automated",
        name: "Преработка карбонатов",
        labels: [ "building" ],
        cost: 6,

        canPlay: ({ players, me }) => players[me].resources!.energy.production >= 1,

        playServer({ doc, me }) {
            doc.players[me].resources!.energy.production -= 1;
            doc.players[me].resources!.heat.production += 3;
        }
    },

    44: {
        type: "automated",
        name: "Заповедная зона",
        labels: [ "science", "building" ],
        cost: 9,
        globalRequirements: { oxygen: { type: "max", amount: 4 } },

        canPlay({ field }) {
            for (const fcs of Object.values(FIELD_CELL_STATIC)) {
                if (fcs.ocean) continue;
                if (fcs.specialCity) continue;
                let noTilesNear = true;
                for (const nc of fcs.nc) {
                    if (field[nc] !== null) {
                        noTilesNear = false;
                        break;
                    }
                }
                if (noTilesNear) return true;
            }
            return false;
        },

        async playClient({ field, placeTile }) {
            return {
                pos: await placeTile("жетон заповедной зоны", (pos) => {
                    const fcs = FIELD_CELL_STATIC[pos];
                    if (fcs.ocean) return false;
                    if (fcs.specialCity) return false;
                    for (const nc of fcs.nc) {
                        if (field[nc] !== null) return false;
                    }
                    return true;
                })
            };
        },
        playServer({ doc, me, placeTile }, { pos }) {
            placeTile(pos, {
                type: "preserve",
                owner: me,
            });
            doc.players[me].resources!.credits.production += 1;
        },
        vp: () => 1,
    },

    45: {
        type: "automated",
        name: "Атомная энергия",
        labels: [ "energy", "building" ],
        cost: 10,

        canPlay: ({ players, me }) => players[me].resources!.credits.production >= -3,

        playServer({ doc, me }) {
            doc.players[me].resources!.credits.production -= 2;
            doc.players[me].resources!.energy.production += 3;
        },
    },

    47: {
        type: "automated",
        name: "Морские водоросли",
        labels: [ "plants" ],
        cost: 10,
        globalRequirements: { ocean: { type: "min", amount: 5 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.plants.count += 1;
            doc.players[me].resources!.plants.production += 2;
        }
    },

    48: {
        type: "automated",
        name: "Адаптированный лишайник",
        labels: [ "plants" ],
        cost: 9,

        playServer({ doc, me }) {
            doc.players[me].resources!.plants.production += 1;
        }
    },

    52: {
        type: "active",
        subtype: "action",
        name: "Рыба",
        labels: [ "animals" ],
        cost: 9,
        globalRequirements: { temperature: { type: "min", amount: 2 } },

        canPlay({ players }) {
            for (const player of players) {
                if (player.resources!.plants.production >= 1) return true;
            }
            return false;
        },

        async playClient({ selectPlayer }) {
            return {
                player: await selectPlayer(
                    "Выберите игрока, чьё производство растений хотите снизить на 1",
                    (player) => player.resources!.plants.production >= 1,
                )
            }
        },

        playServer({ doc }, { player }) {
            if (doc.players[player].resources!.plants.production < 1) throw new ProjectPlayError("players production of plants is less than 1");
            doc.players[player].resources!.plants.production -= 1;
        },

        doActionServer({ doc, me }) {
            const bc = doc.players[me].board.find(bc => bc.project === 52)!;
            bc.res.animals = (bc.res.animals ?? 0) + 1;
        },

        vp: ({ cardResources }) => cardResources!.animals ?? 0,
    },

    53: {
        type: "automated",
        name: "Озеро Маринер",
        cost: 18,
        globalRequirements: { temperature: { type: "min", amount: 0 } },

        async playClient({ field, placeTile }) {
            let oceanTilesPlaced = field.filter(t => t !== null && t.type === "ocean").length;

            const pos: (number | undefined)[] = [];
            for (let i = 0; i < 2; ++i) {
                if (oceanTilesPlaced < 9) {
                    const p = await placeTile("жетон океана", standardOceanPredicate(field));
                    pos.push(p);
                    oceanTilesPlaced += 1;
                    field[p] = { type: "ocean" };
                } else pos.push(undefined);
            }
            return { pos };
        },

        playServer({ placeTile }, { pos }) {
            placeTile(pos[0], { type: "ocean" });
            placeTile(pos[1], { type: "ocean" });
        },

        vp: () => 2,
    },

    54: {
        type: "active",
        subtype: "action",
        name: "Мелкие животные",
        labels: [ "animals" ],
        cost: 6,
        globalRequirements: { oxygen: { type: "min", amount: 5 } },

        canPlay({ players }) {
            for (const player of players) {
                if (player.resources!.plants.production >= 1) return true;
            }
            return false;
        },

        async playClient({ selectPlayer }) {
            return {
                player: await selectPlayer(
                    "Выберите игрока, чьё производство растений хотите снизить на 1",
                    (player) => player.resources!.plants.production >= 1,
                )
            }
        },

        playServer({ doc }, { player }) {
            if (doc.players[player].resources!.plants.production < 1) throw new ProjectPlayError("players production of plants is less than 1");
            doc.players[player].resources!.plants.production -= 1;
        },

        doActionServer({ doc, me }) {
            const bc = doc.players[me].board.find(bc => bc.project === 54)!;
            bc.res.animals = (bc.res.animals ?? 0) + 1;
        },

        vp: ({ cardResources }) => Math.floor((cardResources!.animals ?? 0) / 2),
    },

    55: {
        type: "automated",
        name: "Выращивание ламинарии",
        labels: [ "plants" ],
        cost: 17,
        globalRequirements: { ocean: { type: "min", amount: 6 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.credits.production += 2;
            doc.players[me].resources!.plants.production += 3;
            doc.players[me].resources!.plants.count += 2;
        },

        vp: () => 1,
    },

    58: {
        type: "automated",
        name: "Луч с Ториевого астероида",
        labels: [ "jupiter", "space", "energy" ],
        cost: 32,

        canPlay: ({ players, me }) => players[me].labels.jupiter >= 1,

        playServer({ doc, me }) {
            doc.players[me].resources!.heat.production += 3;
            doc.players[me].resources!.energy.production += 3;
        },

        vp: () => 1,
    },

    59: {
        type: "automated",
        name: "Мангровые леса",
        labels: [ "plants" ],
        cost: 12,
        globalRequirements: { temperature: { type: "min", amount: 4 } },

        async playClient({ placeTile }) {
            return {
                pos: await placeTile(
                    "жетон озеленения на океаническую область",
                    (pos) => !!FIELD_CELL_STATIC[pos].ocean
                )
            };
        },
        playServer({ me, placeTile }, { pos }) {
            if (!FIELD_CELL_STATIC[pos].ocean) throw new ProjectPlayError("not ocean cell");
            placeTile(pos, {
                type: "greenery",
                owner: me
            });
        },
        
        vp: () => 1,
    },

    60: {
        type: "automated",
        name: "Деревья",
        labels: [ "plants" ],
        cost: 13,
        globalRequirements: { temperature: { type: "min", amount: -4 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.plants.production += 3;
            doc.players[me].resources!.plants.count += 1;
        },

        vp: () => 1,
    },

    63: {
        type: "event",
        name: "Геологоразведка",
        cost: 12,

        async playClient({ selectPlayer }) {
            return {
                player: await selectPlayer(
                    "Выберите игрока, чьи 2 растения хотите уничтожить",
                    () => true,
                ),
            };
        },
        playServer({ doc, me, increaseGlobal }, { player }) {
            increaseGlobal("oxygen", 1);
            doc.players[player].resources!.plants.count -= 2;
            if (doc.players[player].resources!.plants.count < 0) doc.players[player].resources!.plants.count = 0;
            doc.players[me].resources!.steel.count += 2;
        },
    },

    67: {
        type: "automated",
        name: "Право на разработку",
        labels: [ "building" ],
        cost: 9,

        canPlay({ field }) {
            for (let i = 2; i < field.length; ++i) {
                const fcc = field[i];
                const fcs = FIELD_CELL_STATIC[i];
                if (fcc === null && fcs.reward && fcs.reward.some(r => r.res === "steel" || r.res === "titanium")) return true;
            }
            return false;
        },

        async playClient({ placeTile }) {
            return {
                pos: await placeTile(
                    "жетон горной промышленности",
                    (pos) => !!FIELD_CELL_STATIC[pos].reward?.some(r => r.res === "steel" || r.res === "titanium")
                ),
            };
        },

        playServer({ doc, me, placeTile }, { pos }) {
            const fcc = doc.field[pos];
            const fcs = FIELD_CELL_STATIC[pos];
            const reward = fcs.reward?.find(r => r.res === "steel" || r.res === "titanium");
            if (fcc !== null || !reward) throw new ProjectPlayError("bad cell");
            placeTile(pos, {
                type: "mining",
                owner: me,
            });
            doc.players[me].resources![reward.res as ResourceName].production += 1;
        },
    },

    72: {
        type: "active",
        subtype: "action",
        name: "Птицы",
        labels: [ "animals" ],
        cost: 10,
        globalRequirements: { oxygen: { type: "min", amount: 13 } },

        canPlay({ players }) {
            for (const player of players) {
                if (player.resources!.plants.production >= 2) return true;
            }
            return false;
        },

        async playClient({ selectPlayer }) {
            return {
                player: await selectPlayer(
                    "Выберите игрока, чьё производство растений хотите снизить на 2",
                    (player) => player.resources!.plants.production >= 2,
                )
            }
        },

        playServer({ doc }, { player }) {
            if (doc.players[player].resources!.plants.production < 2) throw new ProjectPlayError("players production of plants is less than 2");
            doc.players[player].resources!.plants.production -= 2;
        },

        doActionServer({ doc, me }) {
            const bc = doc.players[me].board.find(bc => bc.project === 72)!;
            bc.res.animals = (bc.res.animals ?? 0) + 1;
        },

        vp: ({ cardResources }) => cardResources!.animals ?? 0,
    },

    75: {
        type: "event",
        name: "Буксировка кометы",
        labels: [ "space" ],
        cost: 23,

        async playClient({ field, placeTile }) {
            const oceanTilesPlaced = field.filter(t => t !== null && t.type === "ocean").length;
            return {
                ...(oceanTilesPlaced < 9 && { pos: await placeTile("жетон океана", standardOceanPredicate(field)) }),
            };
        },

        playServer({ doc, me, placeTile, increaseGlobal }, { pos }) {
            doc.players[me].resources!.plants.count += 2;
            placeTile(pos, { type: "ocean" });
            increaseGlobal("oxygen", 1);
        }
    },

    76: {
        type: "active",
        subtype: "action",
        name: "Космические зеркала",
        labels: [ "energy", "space" ],
        cost: 3,

        canDoAction: ({ players, me }) => players[me].resources!.credits.count >= 7,
        doActionServer({ doc, me }) {
            doc.players[me].resources!.credits.count -= 7;
            doc.players[me].resources!.energy.production += 1;
        }
    },

    77: {
        type: "automated",
        name: "Энергия солнечного ветра",
        labels: [ "science", "space", "energy" ],
        cost: 11,

        playServer({ doc, me }) {
            doc.players[me].resources!.energy.production += 1;
            doc.players[me].resources!.titanium.count += 2;
        }
    },

    78: {
        type: "event",
        name: "Ледяной астероид",
        labels: [ "space" ],
        cost: 23,

        async playClient({ field, placeTile }) {
            let oceanTilesPlaced = field.filter(t => t !== null && t.type === "ocean").length;

            const pos: (number | undefined)[] = [];
            for (let i = 0; i < 2; ++i) {
                if (oceanTilesPlaced < 9) {
                    const p = await placeTile("жетон океана", standardOceanPredicate(field));
                    pos.push(p);
                    oceanTilesPlaced += 1;
                    field[p] = { type: "ocean" };
                } else pos.push(undefined);
            }
            return { pos };
        },
        playServer({ placeTile }, { pos }) {
            placeTile(pos[0], { type: "ocean" });
            placeTile(pos[1], { type: "ocean" });
        },
    },

    80: {
        type: "event",
        name: "Большой ледяной астероид",
        labels: [ "space" ],
        cost: 36,

        async playClient({ field, placeTile, selectPlayer }) {
            let oceanTilesPlaced = field.filter(t => t !== null && t.type === "ocean").length;

            const pos: (number | undefined)[] = [];
            for (let i = 0; i < 2; ++i) {
                if (oceanTilesPlaced < 9) {
                    const p = await placeTile("жетон океана", standardOceanPredicate(field));
                    pos.push(p);
                    oceanTilesPlaced += 1;
                    field[p] = { type: "ocean" };
                } else pos.push(undefined);
            }

            return {
                pos,
                player: await selectPlayer("Выберите игрока, чьи 6 растений хотите уничтожить", () => true),
            };
        },

        playServer({ doc, placeTile, increaseGlobal }, { pos, player }) {
            increaseGlobal("temperature", 2);
            placeTile(pos[0], { type: "ocean" });
            placeTile(pos[1], { type: "ocean" });
            doc.players[player].resources!.plants.count -= 6;
            if (doc.players[player].resources!.plants.count < 0) doc.players[player].resources!.plants.count = 0;
        },
    },

    81: {
        type: "automated",
        name: "Колония на Ганимеде",
        labels: [ "jupiter", "space", "city" ],
        cost: 20,

        playServer({ me, placeTile }) {
            placeTile(1, { type: "city", owner: me });
        },

        vp: ({ me }) => me.labels.jupiter,
    },

    83: {
        type: "automated",
        name: "Гигантское зеркало",
        labels: [ "energy", "space" ],
        cost: 17,

        playServer({ doc, me }) {
            doc.players[me].resources!.energy.production += 3;
        }
    },

    87: {
        type: "automated",
        name: "Трава",
        labels: [ "plants" ],
        cost: 11,
        globalRequirements: { temperature: { type: "min", amount: -16 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.plants.production += 1;
            doc.players[me].resources!.plants.count += 3;
        }
    },

    88: {
        type: "automated",
        name: "Вересковая пустошь",
        labels: [ "plants" ],
        cost: 6,
        globalRequirements: { temperature: { type: "min", amount: -14 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.plants.production += 1;
            doc.players[me].resources!.plants.count += 1;
        }
    },

    89: {
        type: "automated",
        name: "Пероксидная энергия",
        labels: [ "energy", "building" ],
        cost: 7,

        canPlay: ({ players, me }) => players[me].resources!.credits.production >= -4,
        playServer({ doc, me }) {
            doc.players[me].resources!.credits.production -= 1;
            doc.players[me].resources!.energy.production += 2;
        }
    },

    93: {
        type: "automated",
        name: "Кустарник",
        labels: [ "plants" ],
        cost: 10,
        globalRequirements: { temperature: { type: "min", amount: -10 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.plants.production += 2;
            doc.players[me].resources!.plants.count += 2;
        }
    },

    96: {
        type: "automated",
        name: "Теплицы",
        labels: [ "plants", "building" ],
        cost: 6,

        playServer({ doc, me }) {
            const cityTilesPlaced = doc.field.filter(t => t !== null && (t.type === "city" || t.type === "capital")).length;
            doc.players[me].resources!.plants.count += cityTilesPlaced;
        },
    },

    97: {
        type: "automated",
        name: "Ядерная зона",
        labels: [ "earth" ],
        cost: 10,

        async playClient({ placeTile }) {
            return {
                pos: await placeTile("жетон ядерной зоны", (pos) => !FIELD_CELL_STATIC[pos].ocean && !FIELD_CELL_STATIC[pos].specialCity),
            }
        },
        playServer({ me, placeTile, increaseGlobal }, { pos }) {
            if (FIELD_CELL_STATIC[pos].ocean || FIELD_CELL_STATIC[pos].specialCity) throw new ProjectPlayError("bad tile position");
            placeTile(pos, { type: "nuclear", owner: me });
            increaseGlobal("temperature", 2);
        },
        vp: () => -2,
    },

    100: {
        type: "automated",
        name: "Топливные генераторы",
        labels: [ "energy", "building" ],
        cost: 1,

        canPlay: ({ players, me }) => players[me].resources!.credits.production >= -14,
        playServer({ doc, me }) {
            doc.players[me].resources!.credits.production -= 1;
            doc.players[me].resources!.energy.production += 1;
        }
    },

    101: {
        type: "active",
        subtype: "action",
        name: "Плавильные заводы",
        labels: [ "building" ],
        cost: 11,

        canDoAction: ({ players, me }) => players[me].resources!.energy.count >= 4,
        doActionServer({ doc, me, increaseGlobal }) {
            doc.players[me].resources!.energy.count -= 4;
            doc.players[me].resources!.steel.count += 1;
            increaseGlobal("oxygen", 1);
        },
    },

    102: {
        type: "automated",
        name: "Энергосеть",
        labels: [ "energy" ],
        cost: 18,

        playServer({ doc, me }) {
            doc.players[me].resources!.energy.production += doc.players[me].labels.energy;
        },
    },

    103: {
        type: "active",
        subtype: "action",
        name: "Литейные заводы",
        labels: [ "building" ],
        cost: 15,

        canDoAction: ({ players, me }) => players[me].resources!.energy.count >= 4,
        doActionServer({ doc, me, increaseGlobal }) {
            doc.players[me].resources!.energy.count -= 4;
            doc.players[me].resources!.steel.count += 2;
            increaseGlobal("oxygen", 1);
        },
    },

    104: {
        type: "active",
        subtype: "action",
        name: "Обогащение руды",
        labels: [ "building" ],
        cost: 13,

        canDoAction: ({ players, me }) => players[me].resources!.energy.count >= 4,
        doActionServer({ doc, me, increaseGlobal }) {
            doc.players[me].resources!.energy.count -= 4;
            doc.players[me].resources!.titanium.count += 1;
            increaseGlobal("oxygen", 1);
        },
    },

    108: {
        type: "automated",
        name: "Открытый город",
        labels: [ "city", "building" ],
        cost: 23,
        globalRequirements: { oxygen: { type: "min", amount: 12 } },

        canPlay: ({ players, me }) => players[me].resources!.energy.production >= 1,
        async playClient({ field, placeTile }) {
            return {
                pos: await placeTile("жетон города", standardCityPredicate(field)),
            }
        },
        playServer({ doc, me, placeTile }, { pos }) {
            doc.players[me].resources!.energy.production -= 1;
            doc.players[me].resources!.credits.production += 4;
            doc.players[me].resources!.plants.count += 2;
            placeTile(pos, { type: "city", owner: me });
        },

        vp: () => 1,
    },

    113: {
        type: "automated",
        name: "Солнечная энергия",
        labels: [ "energy", "building" ],
        cost: 11,

        playServer({ doc, me }) {
            doc.players[me].resources!.energy.production += 1;
        },

        vp: () => 1,
    },

    114: {
        type: "automated",
        name: "Дыхательные фильтры",
        labels: [ "science" ],
        cost: 11,
        globalRequirements: { oxygen: { type: "min", amount: 7 } },

        vp: () => 2,
    },

    115: {
        type: "automated",
        name: "Искусственный фотосинтез",
        labels: [ "science" ],
        cost: 12,

        async playClient({ makeChoice }) {
            return {
                choice: await makeChoice([
                    {
                        result: "plants",
                        picture: [ { type: "res", res: "plants", production: true } ],
                        text: "увеличить производство растений на 1",
                    },
                    {
                        result: "energy",
                        picture: [ { type: "res", res: "energy", production: true, count: 2 } ],
                        text: "увеличить производство энергии на 2",
                    },
                ]),
            };
        },
        playServer({ doc, me }, { choice }) {
            if (choice === "plants") {
                doc.players[me].resources!.plants.production += 1;
            } else if (choice === "energy") {
                doc.players[me].resources!.energy.production += 2;
            } else throw new ProjectPlayError("unknown choice");
        },
    },

    116: {
        type: "automated",
        name: "Искусственное озеро",
        labels: [ "building" ],
        cost: 15,
        globalRequirements: { temperature: { type: "min", amount: -6 } },

        async playClient({ field, placeTile }) {
            let oceanTilesPlaced = field.filter(t => t !== null && t.type === "ocean").length;
            if (oceanTilesPlaced >= 9) return {};
            return {
                pos: await placeTile(
                    "жетон океана не на океаническую область",
                    (pos) => !FIELD_CELL_STATIC[pos].ocean && !FIELD_CELL_STATIC[pos].specialCity,
                )
            };
        },

        playServer({ placeTile }, { pos }) {
            if (pos === undefined) return;
            if (FIELD_CELL_STATIC[pos].ocean || FIELD_CELL_STATIC[pos].specialCity) throw new ProjectPlayError("bad tile position");
            placeTile(pos, { type: "ocean" });
        },

        vp: () => 1,
    },

    117: {
        type: "automated",
        name: "Геотермальная энергия",
        labels: [ "energy", "building" ],
        cost: 11,

        playServer({ doc, me }) {
            doc.players[me].resources!.energy.production += 2;
        }
    },

    118: {
        type: "automated",
        name: "Земледелие",
        labels: [ "plants" ],
        cost: 16,
        globalRequirements: { temperature: { type: "min", amount: 4 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.credits.production += 2;
            doc.players[me].resources!.plants.production += 2;
            doc.players[me].resources!.plants.count += 2;
        },

        vp: () => 2,
    },

    119: {
        type: "automated",
        name: "Пылезащита",
        cost: 2,
        globalRequirements: { ocean: { type: "max", amount: 3 } },

        vp: () => 1,
    },

    120: {
        type: "automated",
        name: "Городской массив",
        labels: [ "city", "building" ],
        cost: 10,

        canPlay({ players, me, field }) {
            if (players[me].resources!.energy.production < 1) return false;
            for (let i = 2; i < field.length; ++i) {
                const fcs = FIELD_CELL_STATIC[i];
                if (field[i] === null && !fcs.ocean && !fcs.specialCity) {
                    let citiesNear = 0;
                    for (const nc of fcs.nc) {
                        const fcc = field[nc];
                        if (fcc !== null && (fcc.type === "city" || fcc.type === "capital")) {
                            citiesNear += 1;
                        }
                    }
                    if (citiesNear >= 2) return true;
                }
            }
            return false;
        },

        async playClient({ field, placeTile }) {
            return {
                pos: await placeTile(
                    "жетон города по соседству хотя бы с 2 жетонами города",
                    (pos) => {
                        const fcs = FIELD_CELL_STATIC[pos];
                        if (fcs.ocean || fcs.specialCity) return false;
                        let citiesNear = 0;
                        for (const nc of fcs.nc) {
                            const fcc = field[nc];
                            if (fcc !== null && (fcc.type === "city" || fcc.type === "capital")) {
                                citiesNear += 1;
                            }
                        }
                        return citiesNear >= 2;
                    }
                )
            };
        },

        playServer({ doc, me, placeTile }, { pos }) {
            let citiesNear = 0;
            for (const nc of FIELD_CELL_STATIC[pos].nc) {
                const fcc = doc.field[nc];
                if (fcc !== null && (fcc.type === "city" || fcc.type === "capital")) {
                    citiesNear += 1;
                }
            }
            if (citiesNear < 2 || FIELD_CELL_STATIC[pos].ocean || FIELD_CELL_STATIC[pos].specialCity || doc.field[pos] !== null)
                throw new ProjectPlayError("bad tile position");
            doc.players[me].resources!.energy.production -= 1;
            doc.players[me].resources!.credits.production += 2;
            placeTile(pos, { type: "city", owner: me });
        },
    },

    122: {
        type: "automated",
        name: "Мох",
        labels: [ "plants" ],
        cost: 4,
        globalRequirements: { ocean: { type: "min", amount: 3 } },

        canPlay: ({ players, me }) => players[me].resources!.plants.count >= 1,
        playServer({ doc, me }) {
            doc.players[me].resources!.plants.count -= 1;
            doc.players[me].resources!.plants.production += 1;
        }
    },

    126: {
        type: "automated",
        name: "Заводы ПГ",
        labels: [ "building" ],
        cost: 11,

        canPlay: ({ players, me }) => players[me].resources!.energy.production >= 1,
        playServer({ doc, me }) {
            doc.players[me].resources!.energy.production -= 1;
            doc.players[me].resources!.heat.production += 4;
        },
    },

    127: {
        type: "event",
        name: "Водоносный пласт",
        cost: 11,

        async playClient({ field, placeTile }) {
            let oceanTilesPlaced = field.filter(t => t !== null && t.type === "ocean").length;
            return {
                ...(oceanTilesPlaced < 9 && { pos: await placeTile("жетон океана", standardOceanPredicate(field)) }),
            };
        },
        playServer({ placeTile }, { pos }) {
            placeTile(pos, { type: "ocean" });
        }
    },

    128: {
        type: "active",
        subtype: "effect",
        name: "Экологическая зона",
        labels: ["plants", "animals"],
        cost: 12,
        initialResources: {
            animals: 2,
        },

        effects: {
            onPlayProjectCard({ me, player, project, thisCard }) {
                const labels = PROJECT_STATIC[project].labels ?? [];
                if (me === player && project !== 128) {
                    for (const label of labels) {
                        if (label === "plants" || label === "animals") {
                            thisCard!.res.animals = (thisCard!.res.animals ?? 0) + 1;
                        }
                    }
                }
            }
        },

        canPlay({ me, field }) {
            return field
                .filter(c => c !== null && c.type === "greenery" && c.owner === me)
                .length > 0;
        },

        async playClient({ placeTile, field }) {
            return {
                pos: await placeTile("жетон экологической зоны", (pos) => {
                    for (const np of FIELD_CELL_STATIC[pos].nc) {
                        const fcc = field[np];
                        if (fcc !== null && fcc.type === "greenery") return true;
                    }
                    return false;
                }),
            }
        },

        playServer({ me, placeTile }, { pos }) {
            placeTile(pos, {
                type: "ecological",
                owner: me,
            });
        },

        vp: ({ cardResources }) => Math.floor((cardResources!.animals ?? 0) / 2),
    },

    129: {
        type: "automated",
        name: "Дирижабли",
        cost: 13,
        globalRequirements: { oxygen: { type: "min", amount: 5 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.credits.production +=
                doc.field.slice(2).filter(t => t !== null && (t.type === "city" || t.type === "capital")).length;
        },

        vp: () => 1,
    },

    130: {
        type: "automated",
        name: "Черви",
        labels: [ "microbes" ],
        cost: 8,
        globalRequirements: { oxygen: { type: "min", amount: 4 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.plants.production +=
                Math.floor(doc.players[me].labels.microbes / 2);
        },
    },

    131: {
        type: "active",
        subtype: "effect",
        name: "Редуценты",
        labels: [ "microbes" ],
        cost: 5,
        globalRequirements: { oxygen: { type: "min", amount: 3 } },

        effects: {
            onPlayProjectCard({ me, player, thisCard, project }) {
                if (me === player) {
                    for (const label of (PROJECT_STATIC[project].labels ?? [])) {
                        if (label === "animals" || label === "plants" || label === "microbes") {
                            thisCard!.res.microbes = (thisCard!.res.microbes ?? 0) + 1;
                        }
                    }
                }
            },
        },

        vp: ({ cardResources }) => Math.floor((cardResources!.microbes ?? 0) / 3),
    },

    132: {
        type: "automated",
        name: "Термоядерная энергия",
        labels: [ "science", "energy", "building" ],
        cost: 14,

        canPlay: ({ players, me }) => players[me].labels.energy >= 2,
        playServer({ doc, me }) {
            doc.players[me].resources!.energy.production += 3;
        }
    },

    133: {
        type: "active",
        subtype: "action",
        name: "Грибы-симбионты",
        labels: [ "microbes" ],
        cost: 4,
        globalRequirements: { temperature: { type: "min", amount: -14 } },

        canDoAction: ({ players, me }) => players[me].board.some(bc => bc.project !== 133 && (PROJECT_STATIC[bc.project].labels ?? []).includes("microbes")),
        async doActionClient({ selectBoardCard }) {
            return {
                card: await selectBoardCard(
                    "Выберите карту, на которую хотите добавить 1 микроба",
                    false,
                    bc => bc.project !== 133 && (PROJECT_STATIC[bc.project].labels ?? []).includes("microbes")
                ),
            };
        },
        doActionServer({ doc, me }, { card }) {
            const bc = doc.players[me].board.find(bc => bc.project === card);
            if (!bc) throw new ProjectPlayError("no such card on board");
            if (bc.project === 133) throw new ProjectPlayError("can't place microbes on the same card");
            if (!(PROJECT_STATIC[bc.project].labels ?? []).includes("microbes"))
                throw new ProjectPlayError("can't place microbes in this card");
            
            bc.res.microbes = (bc.res.microbes ?? 0) + 1;
        }
    },

    134: {
        type: "active",
        subtype: "action",
        name: "Морозостойкие грибы",
        labels: ["microbes"],
        cost: 13,
        globalRequirements: { "temperature": { type: "max", amount: -10 } },

        async doActionClient({ makeChoice, selectBoardCard }) {
            const choice = await makeChoice([
                {
                    result: "plants",
                    text: "получить 1 растение",
                    picture: [{
                        type: "res",
                        res: "plants",
                    }]
                },
                {
                    result: "microbes",
                    text: "добавить 2 микробов на другую карту",
                    picture: [{
                        type: "res",
                        res: "microbes",
                        count: 2,
                        star: true,
                    }]
                }
            ]);
            if (choice === "microbes") {
                return {
                    choice,
                    otherCard: await selectBoardCard(
                        "Выберите карту, на которую хотите добавить 2 микробов",
                        false,
                        bc => bc.project !== 134 && (PROJECT_STATIC[bc.project].labels ?? []).includes("microbes")
                    ),
                };
            } else {
                return { choice };
            }
        },

        doActionServer({ doc, me }, { choice, otherCard }) {
            if (choice === "plants") {
                doc.players[me].resources!.plants.count += 1;
            } else if (choice === "microbes") {
                const bc = doc.players[me].board.find(bc => bc.project === otherCard);
                if (!bc) throw new ProjectPlayError("no such card on board");
                if (bc.project === 134) throw new ProjectPlayError("can't place microbes on the same card");
                if (!(PROJECT_STATIC[bc.project].labels ?? []).includes("microbes"))
                    throw new ProjectPlayError("can't place microbes in this card");
                bc.res.microbes = (bc.res.microbes ?? 0) + 2;
            } else throw new ProjectPlayError("unknown choice");
        }
    },

    135: {
        type: "automated",
        name: "Развитые экосистемы",
        labels: [ "plants", "microbes", "animals" ],
        cost: 11,

        canPlay: ({ players, me }) => players[me].labels.plants >= 1 && players[me].labels.microbes >= 1 && players[me].labels.animals >= 1,
        vp: () => 3,
    },

    136: {
        type: "automated",
        name: "Гигантская дамба",
        labels: [ "energy", "building" ],
        cost: 12,
        globalRequirements: { ocean: { type: "min", amount: 4 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.energy.production += 2;
        },
        
        vp: () => 1,
    },

    138: {
        type: "automated",
        name: "Карьер",
        labels: [ "building" ],
        cost: 25,

        canPlay: ({ players, me }) => players[me].resources!.energy.production >= 2,

        playServer({ doc, me, increaseGlobal }) {
            doc.players[me].resources!.energy.production -= 2;
            doc.players[me].resources!.steel.production += 2;
            doc.players[me].resources!.titanium.production += 1;
            increaseGlobal("oxygen", 2);
        },
    },

    139: {
        type: "automated",
        name: "Энергия волн",
        labels: [ "energy" ],
        cost: 8,
        globalRequirements: { ocean: { type: "min", amount: 3 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.energy.production += 1;
        },

        vp: () => 1,
    },

    140: {
        type: "event",
        name: "Потоки лавы",
        cost: 18,

        canPlay: ({ field }) => field[8] === null || field[13] === null || field[20] === null || field[28] === null,
        async playClient({ placeTile }) {
            return {
                pos: await placeTile("жетон вулкана", (pos) => [8, 13, 20, 28].includes(pos)),
            };
        },
        playServer({ doc, me, placeTile, increaseGlobal }, {pos}) {
            if (doc.field[pos] !== null) throw new ProjectPlayError("position is occupied");
            placeTile(pos, { type: "lava", owner: me });
            increaseGlobal("temperature", 2);
        }
    },

    141: {
        type: "automated",
        name: "Энергостанция",
        labels: [ "energy", "building" ],
        cost: 4,

        playServer({ doc, me }) {
            doc.players[me].resources!.energy.production += 1;
        },
    },

    142: {
        type: "automated",
        name: "Проект «Мохол»",
        labels: [ "building" ],
        cost: 20,

        async playClient({ placeTile }) {
            return {
                pos: await placeTile("жетон скважины", (pos) => !!FIELD_CELL_STATIC[pos].ocean),
            };
        },
        playServer({ doc, me, placeTile }, { pos }) {
            if (doc.field[pos] !== null) throw new ProjectPlayError("cell is occupied");
            if (!FIELD_CELL_STATIC[pos].ocean) throw new ProjectPlayError("bad tile position");
            placeTile(pos, { type: "mohole", owner: me });
            doc.players[me].resources!.heat.production += 4;
        },
    },

    143: {
        type: "event",
        name: "Груз с Земли",
        labels: [ "earth", "space" ],
        cost: 36,

        async playClient({ field, placeTile, makeChoice, selectBoardCard }) {
            let oceanTilesPlaced = field.filter(t => t !== null && t.type === "ocean").length;
            const pos = oceanTilesPlaced < 9
                ? await placeTile("жетон океана", standardOceanPredicate(field))
                : undefined;
            const choice = await makeChoice([
                {
                    result: "plants",
                    picture: [ { type: "res", res: "plants", count: 5 } ],
                    text: "получить 5 растений",
                },
                {
                    result: "animals",
                    picture: [ { type: "res", res: "animals", count: 4, star: true } ],
                    text: "добавить 4 животных на другую карту",
                }
            ]);
            if (choice === "plants") {
                return { pos, choice };
            } else {
                return {
                    pos,
                    choice,
                    card: await selectBoardCard(
                        "Выберите карту, на которую хотите добавить 4 животных",
                        false,
                        bc => (PROJECT_STATIC[bc.project].labels ?? []).includes("animals"),
                    ),
                };
            }
        },
        playServer({ doc, me, placeTile, deckPop }, { pos, choice, card }) {
            if (choice === "animals") {
                const bc = doc.players[me].board.find(bc => bc.project === card);
                if (!bc) throw new ProjectPlayError("you don't have this card on board");
                if (!(PROJECT_STATIC[bc.project].labels ?? []).includes("animals"))
                    throw new ProjectPlayError("can't place animals on this card");
                bc.res.animals = (bc.res.animals ?? 0) + 4;
            } else if (choice === "plants") {
                doc.players[me].resources!.plants.count += 5;
            } else {
                throw new ProjectPlayError("unknown choice");
            }
            const projects = deckPop(2);
            doc.players[me].hand.push(...projects);
            placeTile(pos, { type: "ocean" });
        },

        vp: () => 2,
    },

    145: {
        type: "automated",
        name: "Тектоническая энергия",
        labels: [ "energy", "building" ],
        cost: 18,

        canPlay: ({ players, me }) => players[me].labels.science >= 2,

        playServer({ doc, me }) {
            doc.players[me].resources!.energy.production += 3;
        },

        vp: () => 1,
    },

    146: {
        type: "automated",
        name: "Азотолюбивый мох",
        labels: [ "plants" ],
        cost: 8,
        globalRequirements: { ocean: { type: "min", amount: 3 } },

        canPlay: ({ players, me }) => players[me].resources!.plants.count >= 2,

        playServer({ doc, me }) {
            doc.players[me].resources!.plants.count -= 2;
            doc.players[me].resources!.plants.production += 2;
        },
    },

    147: {
        type: "active",
        subtype: "effect",
        name: "Травоядные",
        labels: [ "animals" ],
        cost: 12,
        globalRequirements: { oxygen: { type: "min", amount: 8 } },
        initialResources: { animals: 1 },

        effects: {
            onPlaceTile({ me, tile, thisCard }) {
                if (tile.type === "greenery" && tile.owner === me) {
                    thisCard!.res.animals! += 1;
                }
            }
        },

        canPlay: ({ players }) => players.some(p => p.resources!.plants.production >= 1),

        async playClient({ selectPlayer }) {
            return {
                player: await selectPlayer(
                    "Выберите игрока, чьё производство растений хотите снизить на 1",
                    player => player.resources!.plants.production >= 1,
                ),
            };
        },

        playServer({ doc }, { player }) {
            if (doc.players[player].resources!.plants.production < 1)
                throw new ProjectPlayError("plants production is not enough");
            doc.players[player].resources!.plants.production -= 1;
        },

        vp: ({ cardResources }) => Math.floor((cardResources!.animals ?? 0) / 2),
    },

    148: {
        type: "automated",
        name: "Насекомые",
        labels: [ "microbes" ],
        cost: 9,
        globalRequirements: { oxygen: { type: "min", amount: 6 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.plants.production +=
                doc.players[me].labels.plants;
        },
    },

    152: {
        type: "automated",
        name: "Изоляторы",
        cost: 2,

        canPlay: ({ players, me }) => players[me].resources!.heat.production >= 1,

        async playClient({ players, me, numberInRange }) {
            return {
                amount: await numberInRange(
                    "Сколько производства тепла обменять на производство мегакредитов",
                    1, players[me].resources!.heat.production
                ),
            };
        },

        playServer({ doc, me }, { amount }) {
            if (doc.players[me].resources!.heat.production < amount)
                throw new ProjectPlayError("not enough heat");
            doc.players[me].resources!.heat.production -= amount;
            doc.players[me].resources!.credits.production += amount;
        },
    },

    153: {
        type: "active",
        subtype: "effect",
        name: "Технология адаптации",
        labels: [ "science" ],
        cost: 12,

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

        vp: () => 1,
    },

    155: {
        type: "automated",
        name: "Новые микроорганизмы",
        labels: [ "science", "microbes" ],
        cost: 16,
        globalRequirements: { temperature: { type: "max", amount: -14 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.plants.production += 2;
        },
    },

    157: {
        type: "active",
        subtype: "action",
        name: "Нитратные бактерии",
        labels: [ "microbes" ],
        cost: 11,
        initialResources: { microbes: 3 },

        async doActionClient({ players, me, makeChoice }) {
            const bc = players[me].board.find(bc => bc.project === 157)!;
            if ((bc.res.microbes ?? 0) < 3) return { choice: "add" }
            else return {
                choice: await makeChoice([
                    {
                        result: "add",
                        picture: [{ type: "res", res: "microbes" }],
                        text: "добавить 1 микроба на эту карту",
                    },
                    {
                        result: "tr",
                        picture: [{ type: "res", res: "microbes", count: 3 }, "arrow", { type: "parameter", parameter: "tr" }],
                        text: "повысить свой РТ за 3 микробов",
                    }
                ]),
            };
        },
        doActionServer({ doc, me, gainTR }, { choice }) {
            const bc = doc.players[me].board.find(bc => bc.project === 157);
            if (!bc) throw new ProjectPlayError("you don't have this card on board");
            if (choice === "add") {
                bc.res.microbes! += 1;
            } else if (choice === "tr") {
                if (bc.res.microbes! < 3) throw new ProjectPlayError("not enough microbes");
                bc.res.microbes! -= 3;
                gainTR(1);
            } else throw new ProjectPlayError("unknown choice");
        }
    },

    158: {
        type: "automated",
        name: "Промышленные микробы",
        labels: [ "microbes", "building" ],
        cost: 12,

        playServer({ doc, me }) {
            doc.players[me].resources!.energy.production += 1;
            doc.players[me].resources!.steel.production += 1;
        }
    },

    159: {
        type: "automated",
        name: "Лишайник",
        labels: ["plants"],
        cost: 7,
        globalRequirements: { "temperature": { type: "min", amount: -24 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.plants.production += 1;
        },
    },

    161: {
        type: "event",
        name: "Груз с Европы",
        labels: [ "space" ],
        cost: 15,

        async playClient({ field, placeTile }) {
            const oceanTilesPlaced = field.filter(t => t !== null && t.type === "ocean").length;
            if (oceanTilesPlaced >= 9) return undefined;
            else return {
                pos: await placeTile("жетон океана", standardOceanPredicate(field)),
            };
        },

        playServer({ doc, me, placeTile, deckPop }, { pos }) {
            placeTile(pos, { type: "ocean" });
            doc.players[me].hand.push(...deckPop());
        }
    },

    162: {
        type: "event",
        name: "Ввоз парниковых газов",
        labels: [ "earth", "space" ],
        cost: 7,

        playServer({ doc, me }) {
            doc.players[me].resources!.heat.production += 1;
            doc.players[me].resources!.heat.count += 3;
        }
    },

    163: {
        type: "event",
        name: "Ввоз азота",
        labels: [ "earth", "space" ],
        cost: 23,

        canPlay: ({ players, me }) =>
            players[me].board.some(bc => (PROJECT_STATIC[bc.project].labels ?? []).includes("microbes")) &&
            players[me].board.some(bc => (PROJECT_STATIC[bc.project].labels ?? []).includes("animals")),

        async playClient({ selectBoardCard }) {
            return {
                microbes: await selectBoardCard(
                    "Выберите карту, на которую хотите добавить 3 микробов",
                    false,
                    bc => (PROJECT_STATIC[bc.project].labels ?? []).includes("microbes")
                ),
                animals: await selectBoardCard(
                    "Выберите карту, на которую хотите добавить 2 животных",
                    false,
                    bc => (PROJECT_STATIC[bc.project].labels ?? []).includes("animals")
                ),
            };
        },

        playServer({ doc, me, gainTR }, { microbes, animals }) {
            const bcMicrobes = doc.players[me].board.find(bc => bc.project === microbes);
            const bcAnimals = doc.players[me].board.find(bc => bc.project === animals);
            if (!bcMicrobes || !bcAnimals) throw new ProjectPlayError("can't add resources on the card you don't have on board");
            if (!(PROJECT_STATIC[microbes].labels ?? []).includes("microbes")) throw new ProjectPlayError("can't add microbes on this card");
            if (!(PROJECT_STATIC[animals].labels ?? []).includes("animals")) throw new ProjectPlayError("can't add animals on this card");

            gainTR(1);
            doc.players[me].resources!.plants.count += 4;
            bcMicrobes.res.microbes = (bcMicrobes.res.microbes ?? 0) + 3;
            bcAnimals.res.animals = (bcAnimals.res.animals ?? 0) + 2;
        },
    },

    164: {
        type: "automated",
        name: "Микроветряки",
        cost: 3,

        playServer({ doc, me }) {
            doc.players[me].resources!.energy.production += 1;
        },
    },

    165: {
        type: "automated",
        name: "Генераторы МП",
        labels: [ "building" ],
        cost: 20,

        canPlay: ({ players, me }) => players[me].resources!.energy.production >= 4,
        playServer({ doc, me, gainTR }) {
            if (doc.players[me].resources!.energy.production < 4) throw new ProjectPlayError("not enough energy production");
            doc.players[me].resources!.energy.production -= 4;
            doc.players[me].resources!.plants.production += 2;
            gainTR(3);
        },
    },

    166: {
        type: "active",
        subtype: "effect",
        name: "Шаттлы",
        labels: [ "space" ],
        cost: 10,
        globalRequirements: { oxygen: { type: "min", amount: 5 } },

        effects: {
            modifyProjectCost(cost, projectStatic) {
                if ((projectStatic.labels ?? []).includes("space")) return cost - 2;
                return cost;
            },
        },

        canPlay: ({ players, me }) => players[me].resources!.energy.production >= 1,
        playServer({ doc, me }) {
            if (doc.players[me].resources!.energy.production < 1) throw new ProjectPlayError("not enough energy production");
            doc.players[me].resources!.energy.production -= 1;
            doc.players[me].resources!.credits.production += 2;
        },

        vp: () => 1,
    },

    167: {
        type: "event",
        name: "Ввоз обогащённых ПГ",
        labels: [ "earth", "space" ],
        cost: 9,

        playServer({ doc, me }) {
            doc.players[me].resources!.heat.production += 2;
        }
    },

    168: {
        type: "automated",
        name: "Ветряки",
        labels: [ "energy", "building" ],
        cost: 6,
        globalRequirements: { oxygen: { type: "min", amount: 7 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.energy.production += 1;
        },

        vp: () => 1,
    },

    169: {
        type: "automated",
        name: "Земледелие в тундре",
        labels: [ "plants" ],
        cost: 16,
        globalRequirements: { temperature: { type: "min", amount: -6 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.plants.production += 1;
            doc.players[me].resources!.credits.production += 2;
            doc.players[me].resources!.plants.count += 1;
        },

        vp: () => 2,
    },

    170: {
        type: "event",
        name: "Аммиачный астероид",
        labels: [ "space" ],
        cost: 26,

        canPlay: ({ players, me }) => players[me].board.some(bc => (PROJECT_STATIC[bc.project].labels ?? []).includes("microbes")),

        async playClient({ selectBoardCard }) {
            return {
                card: await selectBoardCard(
                    "Выберите карту, на которую хотите добавить 2 микробов",
                    false,
                    bc => (PROJECT_STATIC[bc.project].labels ?? []).includes("microbes"),
                ),
            };
        },
        playServer({ doc, me }, { card }) {
            const bc = doc.players[me].board.find(bc => bc.project === card);
            if (!bc) throw new ProjectPlayError("you don't have this card on board");
            if (!(PROJECT_STATIC[card].labels ?? []).includes("microbes")) throw new ProjectPlayError("can't add microbes to this card");
            bc.res.microbes = (bc.res.microbes ?? 0) + 2;
            doc.players[me].resources!.heat.production += 3;
            doc.players[me].resources!.plants.production += 1;
        },
    },

    171: {
        type: "automated",
        name: "Магнитный купол",
        labels: [ "building" ],
        cost: 5,

        canPlay: ({ players, me }) => players[me].resources!.energy.production >= 2,

        playServer({ doc, me, gainTR }) {
            if (doc.players[me].resources!.energy.production < 2) throw new ProjectPlayError("not enough energy production");
            doc.players[me].resources!.energy.production -= 2;
            doc.players[me].resources!.plants.production += 1;
            gainTR(1);
        },
    },

    172: {
        type: "active",
        subtype: "effect",
        name: "Питомцы",
        labels: ["earth", "animals"],
        cost: 10,
        disallowResourceDecrease: true,
        initialResources: { animals: 1 },

        effects: {
            onPlaceTile({ tile, thisCard }) {
                if (tile.type === "city" || tile.type === "capital") {
                    thisCard!.res.animals! += 1;
                }
            }
        },


        vp: ({ cardResources }) => cardResources!.animals! / 2,
    },

    174: {
        type: "automated",
        name: "Защищённая долина",
        labels: [ "plants", "building" ],
        cost: 23,

        async playClient({ placeTile }) {
            return {
                pos: await placeTile(
                    "жетон озеленения",
                    (pos) => !!FIELD_CELL_STATIC[pos].ocean,
                ),
            };
        },
        playServer({ doc, me, placeTile }, { pos }) {
            if (doc.field[pos] !== null) throw new ProjectPlayError("this cell is occupied");
            if (!FIELD_CELL_STATIC[pos].ocean) throw new ProjectPlayError("can't place thile to this cell");
            doc.players[me].resources!.credits.production += 2;
            placeTile(pos, { type: "greenery", owner: me });
        },
    },

    176: {
        type: "automated",
        name: "Земледелие в ночи",
        labels: [ "plants", "building" ],
        cost: 10,
        globalRequirements: { temperature: { type: "min", amount: -20 } },

        playServer({ doc, me }) {
            doc.players[me].resources!.credits.production += 1;
            doc.players[me].resources!.plants.count += 2;
        },

        vp: () => 1,
    },

    177: {
        type: "active",
        subtype: "action",
        name: "Разложение воды",
        labels: [ "building" ],
        cost: 12,
        globalRequirements: { ocean: { type: "min", amount: 2 } },

        canDoAction: ({ players, me }) => players[me].resources!.energy.count >= 3,
        doActionServer({ doc, me, increaseGlobal }) {
            if (doc.players[me].resources!.energy.count < 3) throw new ProjectPlayError("not enough energy");
            doc.players[me].resources!.energy.count -= 3;
            increaseGlobal("oxygen", 1);
        },
    },

    178: {
        type: "automated",
        name: "Теплоуловители",
        labels: [ "energy", "building" ],
        cost: 6,

        canPlay: ({ players }) => players.some(p => p.resources!.heat.production >= 2),

        async playClient({ selectPlayer }) {
            return {
                player: await selectPlayer(
                    "Выберите игрока, чьё прозводство тепла хотите снизить на 2",
                    p => p.resources!.heat.production >= 2,
                ),
            };
        },

        playServer({ doc, me }, { player }) {
            if (doc.players[player].resources!.heat.production < 2) throw new ProjectPlayError("this player heat production is not enough");
            doc.players[player].resources!.heat.production -= 2;
            doc.players[me].resources!.energy.production += 1;
        },

        vp: () => -1,
    },

    179: {
        type: "automated",
        name: "Производство почвы",
        labels: [ "building" ],
        cost: 9,

        canPlay: ({ players, me }) => players[me].resources!.energy.production >= 1,

        playServer({ doc, me }) {
            if (doc.players[me].resources!.energy.production < 1) throw new ProjectPlayError("energy proection is not enough");
            doc.players[me].resources!.energy.production -= 1;
            doc.players[me].resources!.plants.production += 1;
        },

        vp: () => 1,
    },

    181: {
        type: "event",
        name: "Таяние ледников",
        cost: 5,
        globalRequirements: { temperature: { type: "min", amount: 2 } },

        async playClient({ field, placeTile }) {
            const oceanTilesPlaced = field.filter(t => t !== null && t.type === "ocean").length;
            if (oceanTilesPlaced >= 9) return {};
            return {
                pos: await placeTile("жетон океана", standardOceanPredicate(field)),
            };
        },

        playServer({ placeTile }, { pos }) {
            placeTile(pos, { type: "ocean" });
        },
    },

    183: {
        type: "automated",
        name: "Сжигание биомассы",
        labels: [ "energy", "building" ],
        cost: 4,
        globalRequirements: { oxygen: { type: "min", amount: 6 } },

        canPlay: ({ players }) => players.some(p => p.resources!.plants.production >= 1),

        async playClient({ selectPlayer }) {
            return {
                player: await selectPlayer(
                    "Выберите игрока, чьё прозводство растений хотите уменьшить на 1",
                    p => p.resources!.plants.production >= 1,
                ),
            };
        },

        playServer({ doc, me }, { player }) {
            if (doc.players[player].resources!.plants.production < 1) throw new ProjectPlayError("this player plants production is not enough");
            doc.players[player].resources!.plants.production -= 1;
            doc.players[me].resources!.energy.production += 2;
        },

        vp: () => -1,
    },

    184: {
        type: "active",
        subtype: "action",
        name: "Домашний скот",
        labels: [ "animals" ],
        cost: 13,
        globalRequirements: { oxygen: { type: "min", amount: 9 } },

        canPlay: ({ players, me }) => players[me].resources!.plants.production >= 1,
        playServer({ doc, me }) {
            if (doc.players[me].resources!.plants.production < 1) throw new ProjectPlayError("plants production is not enough");
            doc.players[me].resources!.plants.production -= 1;
            doc.players[me].resources!.credits.production += 2;
        },

        doActionServer({ doc, me }) {
            const bc = doc.players[me].board.find(bc => bc.project === 184)!;
            bc.res.animals = (bc.res.animals ?? 0) + 1;
        },

        vp: ({ cardResources }) => (cardResources!.animals ?? 0),
    },

    187: {
        type: "active",
        subtype: "action",
        name: "Закачивание воды",
        labels: [ "building" ],
        cost: 18,

        canDoAction({ field, players, me }) {
            const oceanTilesPlaced = field.filter(t => t !== null && t.type === "ocean").length;
            const potentialCredits = players[me].resources!.credits.count + players[me].resources!.steel.count * 2;
            return potentialCredits >= 8 && oceanTilesPlaced < 9;
        },
        async doActionClient({ field, distributeResources, placeTile }) {
            return {
                fee: await distributeResources(8, { steel: 2 }),
                pos: await placeTile("жетон океана", standardOceanPredicate(field)),
            };
        },
        doActionServer({ placeTile, validateFee, doc, me }, { fee, pos }) {
            const oceanTilesPlaced = doc.field.filter(t => t !== null && t.type === "ocean").length;
            if (oceanTilesPlaced >= 9) throw new ProjectPlayError("can't play this card when 9 ocean tiles already placed");
            if (doc.field[pos] !== null) throw new ProjectPlayError("this cell is occupid");
            validateFee(doc, me, 8, fee, ["building"], false);
            for (const [name, val] of Object.entries(fee) as [ResourceName, number][]) {
                doc.players[me].resources![name].count -= val;
            }
            placeTile(pos, { type: "ocean" });
        },
    },

    188: {
        type: "event",
        name: "Затопление",
        cost: 7,
        
        canPlay: ({ field }) => field.filter(t => t !== null && t.type === "ocean").length < 9,

        async playClient({ me, field, placeTile, selectPlayer }) {
            const pos = await placeTile("жетон океана", standardOceanPredicate(field));
            let decreaseCreds = false;
            for (const nc of FIELD_CELL_STATIC[pos].nc) {
                const fcc = field[nc];
                if (fcc !== null && fcc.type !== "ocean" && fcc.owner !== me) {
                    decreaseCreds = true;
                    break;
                }
            }
            return {
                pos,
                ...(decreaseCreds && { player: await selectPlayer(
                    "Выберите игрока, которого хотите заставить заплатить до 4 мегакредитов",
                    p => p.idx !== me,
                ) }),
            };
        },

        playServer({ doc, placeTile }, { pos, player }) {
            const oceanTilesPlaced = doc.field.filter(t => t !== null && t.type === "ocean").length;
            if (oceanTilesPlaced >= 9) throw new ProjectPlayError("can't play this card when 9 ocean tiles already placed");
            if (doc.field[pos] !== null) throw new ProjectPlayError("this cell is occupid");
            let ok = false;
            for (const nc of FIELD_CELL_STATIC[pos].nc) {
                const fcc = doc.field[nc];
                if (fcc !== null && fcc.type !== "ocean" && fcc.owner === player) {
                    ok = true;
                    break;
                }
            }
            if (!ok) throw new ProjectPlayError("this player doesn't have tiles near cell");
            placeTile(pos, { type: "ocean" });
            if (player !== undefined) {
                doc.players[player].resources!.credits.count -= 4;
                if (doc.players[player].resources!.credits.count < 0) doc.players[player].resources!.credits.count = 0;
            }
        },

        vp: () => -1,
    },

    189: {
        type: "automated",
        name: "Энергосбережение",
        labels: [ "energy" ],
        cost: 15,

        canPlay: ({field}) => field.some(t => t !== null && (t.type === "city" || t.type === "capital")),

        playServer({ doc, me }) {
            const amount = doc.field.filter(t => t !== null && (t.type === "city" || t.type === "capital")).length;
            doc.players[me].resources!.energy.production += amount;
        }
    },

    190: {
        type: "event",
        name: "Аккумуляция тепла",
        cost: 1,

        canPlay: ({ players, me }) => players[me].resources!.heat.count >= 5,

        async playClient({ makeChoice, selectBoardCard }) {
            const choice = await makeChoice([
                {
                    result: "plants",
                    picture: [{ type: "res", res: "plants", count: 4 }],
                    text: "получить 4 растения",
                },
                {
                    result: "animals",
                    picture: [{ type: "res", res: "animals", count: 2, star: true }],
                    text: "добавить 2 животных на другую карту",
                }
            ]);
            return {
                choice,
                ...(choice === "animals" && { card: await selectBoardCard(
                    "Выберите карту, на которую хотите добавить 2 животных",
                    false,
                    bc => (PROJECT_STATIC[bc.project].labels ?? []).includes("animals"),
                ) }),
            };
        },
        playServer({ doc, me }, { choice, card }) {
            if (doc.players[me].resources!.heat.count < 5) throw new ProjectPlayError("heat is not enough");
            if (choice === "plants") {
                doc.players[me].resources!.plants.count += 4;
            } else if (choice === "animals") {
                if (card === undefined) throw new ProjectPlayError("card is not specified");
                const bc = doc.players[me].board.find(bc => bc.project === card);
                if (!bc) throw new ProjectPlayError("you don't have this card on board");
                if (!(PROJECT_STATIC[card].labels ?? []).includes("animals")) throw new ProjectPlayError("can't place animals on this card");
                bc.res.animals = (bc.res.animals ?? 0) + 2;
            }
            doc.players[me].resources!.heat.count -= 5;
        }
    },

    191: {
        type: "event",
        name: "Разморозка ледников",
        cost: 8,
        globalRequirements: { temperature: { type: "min", amount: -8 } },

        async playClient({ field, placeTile }) {
            const oceanTilesPlaced = field.filter(t => t !== null && t.type === "ocean").length;
            if (oceanTilesPlaced >= 9) return {};
            else return {
                pos: await placeTile("жетон океана", standardOceanPredicate(field)),
            };
        },
        playServer({ placeTile }, { pos }) {
            placeTile(pos, { type: "ocean" });
        },
    },

    193: {
        type: "automated",
        name: "Плантация",
        labels: [ "plants" ],
        cost: 15,
        
        canPlay: ({ players, me }) => players[me].labels.science >= 2,

        async playClient({ field, players, me, placeTile }) {
            return {
                pos: await placeTile("жетон озеленения", standardGreeneryPredicate(field, players[me])),
            };
        },

        playServer({ me, placeTile }, { pos }) {
            placeTile(pos, { type: "greenery", owner: me });
        },
    },

    198: {
        type: "automated",
        name: "Иммиграционный шаттл",
        labels: [ "earth", "space" ],
        cost: 31,

        playServer({ doc, me }) {
            doc.players[me].resources!.credits.production += 5;
        },

        vp: ({ field }) => Math.floor(field.filter(t => t !== null && (t.type === "city" || t.type === "capital")).length / 3),
    },

    200: {
        type: "active",
        subtype: "effect",
        name: "Город иммигрантов",
        labels: [ "city", "building" ],
        cost: 13,

        effects: {
            onPlaceTile({ doc, me, tile }) {
                if (tile.type === "city" || tile.type === "capital") {
                    doc.players[me].resources!.credits.production += 1;
                }
            },
        },

        canPlay: ({ players, me }) => players[me].resources!.energy.production >= 1 && players[me].resources!.credits.production >= -13,

        async playClient({ field, placeTile }) {
            return {
                pos: await placeTile("жетон города", standardCityPredicate(field)),
            };
        },

        playServer({ doc, me, placeTile }, { pos }) {
            if (doc.players[me].resources!.energy.production < 1) throw new ProjectPlayError("energy production is not enough");
            if (doc.players[me].resources!.credits.production < -13) throw new ProjectPlayError("credits production is not enough");
            if (!standardCityPredicate(doc.field)(pos)) throw new ProjectPlayError("bad tile position");
            doc.players[me].resources!.energy.production -= 1;
            doc.players[me].resources!.energy.production -= 1;
            placeTile(pos, { type: "city", owner: me });
        },
    },

    202: {
        type: "active",
        subtype: "action",
        name: "Подземные взрывы",
        labels: [ "building" ],
        cost: 6,

        canDoAction: ({ players, me }) => players[me].resources!.credits.count >= 10,

        doActionServer({ doc, me }) {
            if (doc.players[me].resources!.credits.count < 10) throw new ProjectPlayError("credits are not enough");
            doc.players[me].resources!.credits.count -= 10;
            doc.players[me].resources!.heat.production += 2;
        },
    },

    203: {
        type: "automated",
        name: "Солнечное зеркало",
        labels: [ "space" ],
        cost: 35,

        playServer({ doc, me }) {
            doc.players[me].resources!.heat.production += 7;
        },
    },

    205: {
        type: "automated",
        name: "Радиохимический завод",
        labels: [ "building" ],
        cost: 8,

        canPlay: ({ players, me }) => players[me].resources!.energy.production >= 1,

        playServer({ doc, me, gainTR }) {
            if (doc.players[me].resources!.energy.production < 1) throw new Error("energy production is not enough");
            doc.players[me].resources!.energy.production -= 1;
            gainTR(2);
        },
    },

    206: {
        type: "event",
        name: "Спецпроект",
        labels: [ "science" ],
        cost: 4,

        playServer({ doc, me }) {
            doc.players[me].specialProject = true;
        }
    },
}
