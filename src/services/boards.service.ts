import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, writeBatch, type DocumentData, type Unsubscribe } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/firebase/config";
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

export async function createBoard(name: string, accessCode: string, user: User) {
  const board = doc(boardsPath);
  const member = doc(board, "members", user.uid);
  const access = doc(board, "_private", "access");
  const userMembership = doc(db, "users", user.uid, "boardMemberships", board.id);
  const batch = writeBatch(db);
  const profile = { userId: user.uid, name: user.displayName || "Anonymous", photoURL: user.photoURL };

  batch.set(board, { name: name.trim(), createdByName: profile.name, createdAt: serverTimestamp(), memberCount: 1 });
  batch.set(member, { ...profile, role: "owner", joinedAt: serverTimestamp() });
  batch.set(access, { accessCode: accessCode.trim(), createdAt: serverTimestamp() });
  batch.set(userMembership, { boardId: board.id, role: "owner", joinedAt: serverTimestamp() });
  await batch.commit();
  return { boardId: board.id };
}

export async function joinBoard(boardId: string, accessCode: string, user: User) {
  try {
    await writeBatch(db).set(doc(db, "workspaces", boardId, "joinRequests", user.uid), {
      userId: user.uid,
      name: user.displayName || "Anonymous",
      photoURL: user.photoURL,
      accessCode: accessCode.trim(),
      requestedAt: serverTimestamp(),
    }).commit();
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "permission-denied") throw new Error("The access code is incorrect.");
    throw error;
  }
}
