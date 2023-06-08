import { UserDetailsDTO } from "../dto/user.js";

type UserJoinedEvent = {
    type: "user_joined",
    data: {
        user: UserDetailsDTO,
    }
};

type LobbyDisbandedEvent = {
    type: "lobby_disbanded",
};

type UserLeftEvent = {
    type: "user_left",
    data: {
        userId: string,
    }
};

type UserKickedEvent = {
    type: "user_kicked",
    data: {
        userId: string,
    }
}

type OwnerChangedEvent = {
    type: "owner_changed",
    data: {
        newOwnerId: string,
    }
};

type GameStartedEvent = {
    type: "game_started",
    data: {
        gameId: string,
    }
};

export type LobbyEvent =
    | UserJoinedEvent
    | LobbyDisbandedEvent
    | UserLeftEvent
    | UserKickedEvent
    | OwnerChangedEvent
    | GameStartedEvent;
    