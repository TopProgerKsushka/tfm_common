import type { UserDetailsDTO } from "./user.js";

type OpenLobbyListItem = {
    open: true,
    id: string,
    name: string,
    owner: string,
    members: UserDetailsDTO[],
};

type ClosedLobbyListItem = {
    open: false,
    id: string,
    name: string,
};

export type LobbyListItemDTO =
    | OpenLobbyListItem
    | ClosedLobbyListItem;

export type LobbyDetailsDTO = {
    id: string,
    open: boolean,
    name: string,
    ei: number,
    owner: string,
    members: UserDetailsDTO[],
};
