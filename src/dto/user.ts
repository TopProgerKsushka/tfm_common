type UserInLobbyStatus = {
    activity: "lobby",
    lobbyId: string,
};

type UserInGameStatus = {
    activity: "game",
    gameId: string,
};

export type UserStatusDTO =
    | UserInLobbyStatus
    | UserInGameStatus
    | undefined;

export type UserDetailsDTO = {
    id: string,
    username: string,
    hasAvatar: boolean,
    registrationTime: string,

    personal: {
        sex?: "male" | "female",
        about?: string,
    },

    stats: {
        gamesPlayed: number,
        gamesWon: number,
        elo: number,
    },

    status?: UserStatusDTO,
};