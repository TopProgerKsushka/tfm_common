import type { Tile } from "./tiles.js";
import type { ResourceName } from "./string_types.js";

export type FieldCellContent = Tile | null;
export type FieldContents = [FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent, FieldCellContent];

type FieldCellReward = {
    res: ResourceName | "project",
    amount: number,
}

export type FieldCellStatic = {
    specialCity?: boolean,
    specialZone?: string,
    ocean?: boolean,
    reward?: FieldCellReward[],
    nc: number[],
};

export const FIELD_CELL_STATIC: Record<number, FieldCellStatic> = {
    0: {
        specialZone: "Космопорт на Фобосе",
        specialCity: true,
        nc: [],
    },
    1: {
        specialZone: "Колония на Ганимеде",
        specialCity: true,
        nc: [],
    },
    2: {
        reward: [{ res: "steel", amount: 2 }],
        nc: [3, 7, 8],
    },
    3: {
        ocean: true,
        reward: [{ res: "steel", amount: 2 }],
        nc: [2, 4, 8, 9],
    },
    4: {
        nc: [3, 5, 9, 10],
    },
    5: {
        ocean: true,
        reward: [{ res: "project", amount: 1 }],
        nc: [4, 6, 10, 11],
    },
    6: {
        ocean: true,
        nc: [5, 11, 12],
    },
    7: {
        nc: [2, 8, 13, 14],
    },
    8: {
        specialZone: "Купол Фарсида",
        reward: [{ res: "steel", amount: 1 }],
        nc: [2, 3, 7, 9, 14, 15],
    },
    9: {
        nc: [3, 4, 8, 10, 15, 16],
    },
    10: {
        nc: [4, 5, 9, 11, 16, 17],
    },
    11: {
        nc: [5, 6, 10, 12, 17, 18],
    },
    12: {
        ocean: true,
        reward: [{ res: "project", amount: 2 }],
        nc: [6, 11, 18, 19],
    },
    13: {
        specialZone: "Гора Аскрийская",
        reward: [{ res: "project", amount: 1 }],
        nc: [7, 14, 20, 21],
    },
    14: {
        nc: [7, 8, 13, 15, 21, 22],
    },
    15: {
        nc: [8, 9, 14, 16, 22, 23],
    },
    16: {
        nc: [9, 10, 15, 17, 23, 24],
    },
    17: {
        nc: [10, 11, 16, 18, 24, 25],
    },
    18: {
        nc: [11, 12, 17, 19, 25, 26],
    },
    19: {
        reward: [{ res: "steel", amount: 1 }],
        nc: [12, 18, 26, 27],
    },
    20: {
        specialZone: "Гора Павлина",
        reward: [{ res: "plants", amount: 1 }, { res: "titanium", amount: 1 }],
        nc: [13, 21, 28, 29],
    },
    21: {
        reward: [{ res: "plants", amount: 1 }],
        nc: [13, 14, 20, 22, 29, 30],
    },
    22: {
        reward: [{ res: "plants", amount: 1 }],
        nc: [14, 15, 21, 23, 30, 31],
    },
    23: {
        reward: [{ res: "plants", amount: 1 }],
        nc: [15, 16, 22, 24, 31, 32],
    },
    24: {
        reward: [{ res: "plants", amount: 2 }],
        nc: [16, 17, 23, 25, 32, 33],
    },
    25: {
        reward: [{ res: "plants", amount: 1 }],
        nc: [17, 18, 24, 26, 33, 34],
    },
    26: {
        reward: [{ res: "plants", amount: 1 }],
        nc: [18, 19, 25, 27, 34, 35],
    },
    27: {
        ocean: true,
        reward: [{ res: "plants", amount: 2 }],
        nc: [19, 26, 35, 36],
    },
    28: {
        specialZone: "Гора Арсия",
        reward: [{ res: "plants", amount: 2 }],
        nc: [20, 29, 37],
    },
    29: {
        reward: [{ res: "plants", amount: 2 }],
        nc: [20, 21, 28, 30, 37, 38],
    },
    30: {
        specialZone: "Ноктис-Сити",
        specialCity: true,
        reward: [{ res: "plants", amount: 2 }],
        nc: [21, 22, 29, 31, 38, 39],
    },
    31: {
        ocean: true,
        reward: [{ res: "plants", amount: 2 }],
        nc: [22, 23, 30, 32, 39, 40],
    },
    32: {
        ocean: true,
        reward: [{ res: "plants", amount: 2 }],
        nc: [23, 24, 31, 33, 40, 41],
    },
    33: {
        ocean: true,
        reward: [{ res: "plants", amount: 2 }],
        nc: [24, 25, 32, 34, 41, 42],
    },
    34: {
        reward: [{ res: "plants", amount: 2 }],
        nc: [25, 26, 33, 35, 42, 43],
    },
    35: {
        reward: [{ res: "plants", amount: 2 }],
        nc: [26, 27, 34, 36, 43, 44],
    },
    36: {
        reward: [{ res: "plants", amount: 2 }],
        nc: [27, 35, 44],
    },
    37: {
        reward: [{ res: "plants", amount: 1 }],
        nc: [28, 29, 38, 45],
    },
    38: {
        reward: [{ res: "plants", amount: 2 }],
        nc: [29, 30, 37, 39, 45, 46],
    },
    39: {
        reward: [{ res: "plants", amount: 1 }],
        nc: [30, 31, 38, 40, 46, 47],
    },
    40: {
        reward: [{ res: "plants", amount: 1 }],
        nc: [31, 32, 39, 41, 47, 48],
    },
    41: {
        reward: [{ res: "plants", amount: 1 }],
        nc: [32, 33, 40, 42, 48, 49],
    },
    42: {
        ocean: true,
        reward: [{ res: "plants", amount: 1 }],
        nc: [33, 34, 41, 43, 49, 50],
    },
    43: {
        ocean: true,
        reward: [{ res: "plants", amount: 1 }],
        nc: [34, 35, 42, 44, 50, 51],
    },
    44: {
        ocean: true,
        reward: [{ res: "plants", amount: 1 }],
        nc: [35, 36, 43, 51],
    },
    45: {
        nc: [37, 38, 46, 52],
    },
    46: {
        nc: [38, 39, 45, 47, 52, 53],
    },
    47: {
        nc: [39, 40, 46, 48, 53, 54],
    },
    48: {
        nc: [40, 41, 47, 49, 54, 55],
    },
    49: {
        nc: [41, 42, 48, 50, 55, 56],
    },
    50: {
        reward: [{ res: "plants", amount: 1 }],
        nc: [42, 43, 49, 51, 56, 57],
    },
    51: {
        nc: [43, 44, 50, 57],
    },
    52: {
        reward: [{ res: "steel", amount: 2 }],
        nc: [45, 46, 53, 58],
    },
    53: {
        nc: [46, 47, 52, 54, 58, 59],
    },
    54: {
        reward: [{ res: "project", amount: 1 }],
        nc: [47, 48, 53, 55, 59, 60],
    },
    55: {
        reward: [{ res: "project", amount: 1 }],
        nc: [48, 49, 54, 56, 60, 61],
    },
    56: {
        nc: [49, 50, 55, 57, 61, 62],
    },
    57: {
        reward: [{ res: "titanium", amount: 1 }],
        nc: [50, 51, 56, 62],
    },
    58: {
        reward: [{ res: "steel", amount: 1}],
        nc: [52, 53, 59],
    },
    59: {
        reward: [{ res: "steel", amount: 2}],
        nc: [53, 54, 58, 60],
    },
    60: {
        nc: [54, 55, 59, 61],
    },
    61: {
        nc: [55, 56, 60, 62],
    },
    62: {
        ocean: true,
        reward: [{ res: "titanium", amount: 2 }],
        nc: [56, 57, 61],
    },
};