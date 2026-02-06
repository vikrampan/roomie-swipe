const { onDocumentDeleted, onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage().bucket();

// Region optimized for India
setGlobalOptions({ region: "asia-south1" });

/**
 * 1. STORAGE CLEANUP
 * Removes orphaned images when a user is deleted.
 */
exports.cleanupUserStorage = onDocumentDeleted("users/{userId}", async (event) => {
    const userId = event.params.userId;
    const path = `users/${userId}/`;
    try {
        const [files] = await storage.getFiles({ prefix: path });
        if (files.length === 0) return null;
        await Promise.all(files.map(file => file.delete()));
        console.log(`🗑️ Cleaned storage for ${userId}`);
    } catch (error) {
        console.error("Storage cleanup failed", error);
    }
});

/**
 * 2. PROFILE SYNC
 * Syncs name/image changes to all Match documents.
 */
exports.syncUserProfileToMatches = onDocumentUpdated("users/{userId}", async (event) => {
    const userId = event.params.userId;
    const newValue = event.data.after.data();
    const oldValue = event.data.before.data();

    if (newValue.name === oldValue.name && 
        (newValue.images?.[0] || newValue.img) === (oldValue.images?.[0] || oldValue.img)) return null;

    try {
        const matchesQuery = db.collection("matches").where("users", "array-contains", userId);
        const matchesSnap = await matchesQuery.get();
        if (matchesSnap.empty) return null;

        const batch = db.batch();
        const newSnap = {
            uid: userId,
            name: newValue.name,
            img: newValue.images?.[0] || newValue.img || "",
            occupation: newValue.occupation || "Student"
        };

        matchesSnap.forEach(doc => {
            batch.update(doc.ref, { [`profiles.${userId}`]: newSnap });
        });
        await batch.commit();
        console.log(`✅ Synced profile for ${userId}`);
    } catch (error) {
        console.error("Profile sync failed", error);
    }
});

/**
 * 3. UNREAD COUNTER
 * Increments unread messages for the recipient.
 */
exports.incrementUnreadCount = onDocumentCreated("matches/{matchId}/messages/{messageId}", async (event) => {
    const { matchId } = event.params;
    const messageData = event.data.data();
    try {
        const matchRef = db.collection("matches").doc(matchId);
        const matchSnap = await matchRef.get();
        if (!matchSnap.exists) return null;

        const recipientId = matchSnap.data().users.find(uid => uid !== messageData.senderId);
        await matchRef.update({
            [`unreadCount.${recipientId}`]: admin.firestore.FieldValue.increment(1),
            lastActivity: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Counter failed", error);
    }
});