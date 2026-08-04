import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, DEFAULT_WORKSPACE_ID } from "@/firebase/config";
import { actionMeta, emptyActionCounts, type ActionType, type Comment, type CreatePostInput, type Post } from "@/types";

const postsPath = (workspaceId = DEFAULT_WORKSPACE_ID) => collection(db, "workspaces", workspaceId, "posts");
const postRef = (postId: string, workspaceId = DEFAULT_WORKSPACE_ID) => doc(db, "workspaces", workspaceId, "posts", postId);

function authorFromUser(user: User) {
  return { uid: user.uid, name: user.displayName || "Anonymous", photoURL: user.photoURL };
}

function asPost(id: string, data: DocumentData): Post {
  return {
    id,
    type: data.type,
    title: data.title,
    description: data.description,
    author: data.author,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    actionCounts: { ...emptyActionCounts(), ...(data.actionCounts ?? {}) },
    totalActionCount: data.totalActionCount ?? 0,
  };
}

export function subscribeToPosts(
  onData: (posts: Post[]) => void,
  onError: (error: Error) => void,
  workspaceId = DEFAULT_WORKSPACE_ID,
  type?: Post["type"],
): Unsubscribe {
  const feed = type
    ? query(postsPath(workspaceId), where("type", "==", type), orderBy("createdAt", "desc"), limit(50))
    : query(postsPath(workspaceId), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(feed, (snapshot) => onData(snapshot.docs.map((item) => asPost(item.id, item.data()))), onError);
}

/** Listens for posts added after the initial feed hydration. */
export function subscribeToNewPosts(
  onPostAdded: (post: Post) => void,
  onError: (error: Error) => void,
  workspaceId = DEFAULT_WORKSPACE_ID,
): Unsubscribe {
  let hydrated = false;
  const feed = query(postsPath(workspaceId), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(feed, (snapshot) => {
    if (hydrated) snapshot.docChanges().filter((change) => change.type === "added").forEach((change) => onPostAdded(asPost(change.doc.id, change.doc.data())));
    hydrated = true;
  }, onError);
}

export async function createPost(input: CreatePostInput, user: User, workspaceId = DEFAULT_WORKSPACE_ID) {
  return addDoc(postsPath(workspaceId), {
    ...input,
    author: authorFromUser(user),
    actionCounts: emptyActionCounts(),
    totalActionCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updatePost(postId: string, input: Pick<CreatePostInput, "title" | "description" | "type">, workspaceId = DEFAULT_WORKSPACE_ID) {
  await updateDoc(postRef(postId, workspaceId), { ...input, updatedAt: serverTimestamp() });
}

export async function deletePost(postId: string, workspaceId = DEFAULT_WORKSPACE_ID) {
  // Subcollections remain inaccessible after deletion; a scheduled cleanup can remove them later.
  await runTransaction(db, async (transaction) => {
    transaction.delete(postRef(postId, workspaceId));
  });
}

export function subscribeToComments(
  postId: string,
  onData: (comments: Comment[]) => void,
  onError: (error: Error) => void,
  workspaceId = DEFAULT_WORKSPACE_ID,
): Unsubscribe {
  const comments = query(collection(postRef(postId, workspaceId), "comments"), orderBy("createdAt", "asc"), limit(100));
  return onSnapshot(comments, (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data(), createdAt: item.data().createdAt ?? null }) as Comment)), onError);
}

export async function addComment(postId: string, text: string, user: User, workspaceId = DEFAULT_WORKSPACE_ID) {
  await addDoc(collection(postRef(postId, workspaceId), "comments"), {
    text: text.trim(),
    author: authorFromUser(user),
    createdAt: serverTimestamp(),
  });
}

export async function performAction(post: Post, action: ActionType, user: User, workspaceId = DEFAULT_WORKSPACE_ID) {
  const expected = actionMeta[post.type];
  const isSupported = expected.action === action || expected.secondary?.action === action;
  if (!isSupported) throw new Error("That action is not available for this post.");

  const targetPost = postRef(post.id, workspaceId);
  const actionRef = doc(targetPost, "actions", user.uid);

  await runTransaction(db, async (transaction) => {
    const [actionSnapshot, postSnapshot] = await Promise.all([transaction.get(actionRef), transaction.get(targetPost)]);
    if (actionSnapshot.exists()) throw new Error("You have already responded to this post.");
    if (!postSnapshot.exists()) throw new Error("This post is no longer available.");

    const existingCounts = { ...emptyActionCounts(), ...(postSnapshot.data().actionCounts ?? {}) };
    transaction.set(actionRef, { actionType: action, userId: user.uid, createdAt: serverTimestamp() });
    transaction.update(targetPost, {
      [`actionCounts.${action}`]: existingCounts[action] + 1,
      totalActionCount: (postSnapshot.data().totalActionCount ?? 0) + 1,
      updatedAt: serverTimestamp(),
    });
  });
}
