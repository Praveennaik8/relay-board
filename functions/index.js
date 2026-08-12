const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");

initializeApp();
const scrypt = promisify(scryptCallback);
const db = getFirestore();

function requireUser(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before continuing.");
  return request.auth;
}

function validateBoardName(value) {
  if (typeof value !== "string") throw new HttpsError("invalid-argument", "Board name is required.");
  const name = value.trim();
  if (name.length < 2 || name.length > 80) throw new HttpsError("invalid-argument", "Board names must be 2–80 characters.");
  return name;
}

function validateAccessCode(value) {
  if (typeof value !== "string") throw new HttpsError("invalid-argument", "Access code is required.");
  const accessCode = value.trim();
  if (accessCode.length < 6 || accessCode.length > 128) throw new HttpsError("invalid-argument", "Access codes must be 6–128 characters.");
  return accessCode;
}

async function hashAccessCode(accessCode, salt) {
  return (await scrypt(accessCode, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 })).toString("hex");
}

function memberProfile(auth) {
  return {
    userId: auth.uid,
    name: auth.token.name || "Anonymous",
    photoURL: auth.token.picture || null,
  };
}

exports.createBoard = onCall(async (request) => {
  const auth = requireUser(request);
  const name = validateBoardName(request.data?.name);
  const accessCode = validateAccessCode(request.data?.accessCode);
  const boardRef = db.collection("workspaces").doc();
  const accessRef = boardRef.collection("_private").doc("access");
  const memberRef = boardRef.collection("members").doc(auth.uid);
  const userMembershipRef = db.collection("users").doc(auth.uid).collection("boardMemberships").doc(boardRef.id);
  const salt = randomBytes(16).toString("hex");
  const accessCodeHash = await hashAccessCode(accessCode, salt);
  const profile = memberProfile(auth);
  const batch = db.batch();

  batch.set(boardRef, {
    name,
    createdByName: profile.name,
    createdAt: FieldValue.serverTimestamp(),
    memberCount: 1,
  });
  batch.set(memberRef, { ...profile, role: "owner", joinedAt: FieldValue.serverTimestamp() });
  batch.set(userMembershipRef, { boardId: boardRef.id, role: "owner", joinedAt: FieldValue.serverTimestamp() });
  batch.set(accessRef, { salt, accessCodeHash, createdAt: FieldValue.serverTimestamp() });
  await batch.commit();
  return { boardId: boardRef.id };
});

exports.joinBoard = onCall(async (request) => {
  const auth = requireUser(request);
  if (typeof request.data?.boardId !== "string" || !request.data.boardId) throw new HttpsError("invalid-argument", "Board ID is required.");
  const accessCode = validateAccessCode(request.data?.accessCode);
  const boardRef = db.collection("workspaces").doc(request.data.boardId);
  const accessRef = boardRef.collection("_private").doc("access");
  const memberRef = boardRef.collection("members").doc(auth.uid);
  const userMembershipRef = db.collection("users").doc(auth.uid).collection("boardMemberships").doc(boardRef.id);
  const attemptRef = accessRef.collection("joinAttempts").doc(auth.uid);
  const [board, access, attempts] = await Promise.all([boardRef.get(), accessRef.get(), attemptRef.get()]);
  if (!board.exists) throw new HttpsError("not-found", "This board does not exist.");
  if (!access.exists) throw new HttpsError("failed-precondition", "This board cannot be joined with an access code.");

  const now = Timestamp.now();
  const attemptWindowMs = 15 * 60 * 1000;
  const attemptLimit = 5;
  const attemptData = attempts.data();
  const withinAttemptWindow = attemptData?.windowStartedAt instanceof Timestamp
    && now.toMillis() - attemptData.windowStartedAt.toMillis() < attemptWindowMs;
  if (withinAttemptWindow && attemptData.count >= attemptLimit) {
    throw new HttpsError("resource-exhausted", "Too many incorrect access-code attempts. Try again in a few minutes.");
  }

  const { salt, accessCodeHash } = access.data();
  const candidateHash = await hashAccessCode(accessCode, salt);
  const valid = typeof accessCodeHash === "string"
    && timingSafeEqual(Buffer.from(candidateHash, "hex"), Buffer.from(accessCodeHash, "hex"));
  if (!valid) {
    await attemptRef.set(withinAttemptWindow
      ? { count: attemptData.count + 1, lastAttemptAt: now }
      : { count: 1, windowStartedAt: now, lastAttemptAt: now }, { merge: true });
    throw new HttpsError("permission-denied", "The access code is incorrect.");
  }

  const joined = await db.runTransaction(async (transaction) => {
    const currentMembership = await transaction.get(memberRef);
    if (currentMembership.exists) {
      transaction.set(userMembershipRef, { boardId: boardRef.id, role: currentMembership.data().role, joinedAt: currentMembership.data().joinedAt }, { merge: true });
      return false;
    }
    transaction.create(memberRef, { ...memberProfile(auth), role: "member", joinedAt: FieldValue.serverTimestamp() });
    transaction.create(userMembershipRef, { boardId: boardRef.id, role: "member", joinedAt: FieldValue.serverTimestamp() });
    transaction.update(boardRef, { memberCount: FieldValue.increment(1) });
    return true;
  });
  await attemptRef.delete();
  return { joined };
});

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
