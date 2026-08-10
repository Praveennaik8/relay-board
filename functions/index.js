const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const { onDocumentDeleted } = require("firebase-functions/v2/firestore");


initializeApp();

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

    await getFirestore().recursiveDelete(event.data.ref);
    logger.info("Deleted post subcollections.", event.params);
  },
);
