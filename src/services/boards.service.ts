import { collection, doc, limit, onSnapshot, orderBy, query, type DocumentData, type Unsubscribe } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/firebase/config";
import type { Board, BoardMembership } from "@/types";

const boardsPath = collection(db, "workspaces");
const boardRef = (boardId: string) => doc(db, "workspaces", boardId);

function asBoard(id: string, data: DocumentData): Board {
  return {
    id,
    name: data.name,
    createdByName: data.createdByName,
    createdAt: data.createdAt ?? null,
    memberCount: data.memberCount ?? 0,
  };
}

export function subscribeToBoards(onData: (boards: Board[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(query(boardsPath, orderBy("createdAt", "desc"), limit(100)), (snapshot) => onData(snapshot.docs.map((item) => asBoard(item.id, item.data()))), onError);
}

export function subscribeToBoard(boardId: string, onData: (board: Board | null) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(boardRef(boardId), (snapshot) => onData(snapshot.exists() ? asBoard(snapshot.id, snapshot.data()) : null), onError);
}

export function subscribeToMembership(boardId: string, userId: string, onData: (membership: BoardMembership | null) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(doc(boardRef(boardId), "members", userId), (snapshot) => onData(snapshot.exists() ? {
    boardId,
    role: snapshot.data().role,
    joinedAt: snapshot.data().joinedAt ?? null,
  } : null), onError);
}

export function subscribeToJoinedBoardIds(userId: string, onData: (boardIds: Set<string>) => void, onError: (error: Error) => void): Unsubscribe {
  const memberships = collection(db, "users", userId, "boardMemberships");
  return onSnapshot(memberships, (snapshot) => onData(new Set(snapshot.docs.map((item) => item.id))), onError);
}

export async function createBoard(name: string, accessCode: string) {
  const create = httpsCallable<{ name: string; accessCode: string }, { boardId: string }>(functions, "createBoard");
  return (await create({ name, accessCode })).data;
}

export async function joinBoard(boardId: string, accessCode: string) {
  const join = httpsCallable<{ boardId: string; accessCode: string }, { joined: boolean }>(functions, "joinBoard");
  return (await join({ boardId, accessCode })).data;
}
