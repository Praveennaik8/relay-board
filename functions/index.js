const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");

initializeApp();
const db = getFirestore();

/** Converts a security-rule-validated, private join request into membership. */
exports.completeBoardJoin = onDocumentCreated(
  {
    document: "workspaces/{boardId}/joinRequests/{userId}",
    ingressSettings: "ALLOW_INTERNAL_ONLY",
    memory: "256MiB",
    retry: true,
  },
  async (event) => {
    if (!event.data) return;
    const boardRef = event.data.ref.parent.parent;
    const accessRef = boardRef.collection("_private").doc("access");
    const memberRef = boardRef.collection("members").doc(event.params.userId);
    const userMembershipRef = db.collection("users").doc(event.params.userId).collection("boardMemberships").doc(event.params.boardId);

    await db.runTransaction(async (transaction) => {
      const [board, access, membership] = await Promise.all([transaction.get(boardRef), transaction.get(accessRef), transaction.get(memberRef)]);
      transaction.delete(event.data.ref);
      if (!board.exists || !access.exists || event.data.data().accessCode !== access.data().accessCode) return;
      if (membership.exists) {
        transaction.set(userMembershipRef, { boardId: boardRef.id, role: membership.data().role, joinedAt: membership.data().joinedAt }, { merge: true });
        return;
      }

      transaction.create(memberRef, {
        userId: event.params.userId,
        name: event.data.data().name,
        photoURL: event.data.data().photoURL,
        role: "member",
        joinedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(userMembershipRef, { boardId: boardRef.id, role: "member", joinedAt: FieldValue.serverTimestamp() });
      transaction.update(boardRef, { memberCount: FieldValue.increment(1) });
    });
    logger.info("Completed board join request.", event.params);
  },
);

/**
 * Firestore TTL only deletes the post document. This trigger also handles
 * manual deletes and removes every document beneath the deleted post path.
 */
exports.cleanupDeletedPost = onDocumentDeleted(
  {
    document: "workspaces/{workspaceId}/posts/{postId}",
    ingressSettings: "ALLOW_INTERNAL_ONLY",
    memory: "1GiB",
    retry: true,
    timeoutSeconds: 540,
  },
  async (event) => {
    if (!event.data) {
      logger.warn("Post deletion event had no document snapshot.", event.params);
      return;
    }

    await db.recursiveDelete(event.data.ref);
    logger.info("Deleted post subcollections.", event.params);
  },
);
