import { doc, runTransaction, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore'; 
import { db } from '../firebase';

// Helper to get minimal profile data for denormalization
const getProfileSnapshot = async (uid) => {
    try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
            const data = snap.data();
            // Prioritize the first image, fallback to 'img', or placeholder
            const validImg = (data.images && data.images.length > 0) ? data.images[0] : (data.img || "https://via.placeholder.com/150");
            return { 
                name: data.name || "Unknown", 
                img: validImg
            };
        }
    } catch (e) {
        console.warn("Profile snapshot fetch failed", e);
    }
    return { name: "Unknown", img: "https://via.placeholder.com/150" };
};

export const swipeRight = async (myUid, targetUid) => {
  if (!myUid || !targetUid) return { isMatch: false };

  // 1. ALWAYS SORT IDs to ensure A->B and B->A generate the same Match ID
  const matchId = [myUid, targetUid].sort().join("_");

  try {
    return await runTransaction(db, async (transaction) => {
      // Check if they liked us
      const reverseLikeRef = doc(db, "likes", `${targetUid}_${myUid}`);
      const reverseLikeSnap = await transaction.get(reverseLikeRef);

      // Record our like
      const likeRef = doc(db, "likes", `${myUid}_${targetUid}`);
      transaction.set(likeRef, {
        from: myUid,
        to: targetUid,
        timestamp: Date.now()
      });

      // If Mutual Like -> Create Match
      if (reverseLikeSnap.exists()) {
        const matchRef = doc(db, "matches", matchId);
        
        // 🚀 COST OPTIMIZATION: Fetch profiles NOW to store them in the match
        // This is done outside the transaction read-loop for simplicity in this example,
        // but ideally should be pre-fetched or read inside if strict consistency needed.
        // To keep the transaction valid, we should read them before the write.
        // However, getting documents inside transaction requires following "Read before Write" rule strictly.
        // For 'users' which don't change often, we can fetch them separately or trust the client.
        // Here, we use a separate fetch to avoid locking the 'users' collection unnecessarily.
        
        const myProfile = await getProfileSnapshot(myUid);
        const theirProfile = await getProfileSnapshot(targetUid);

        transaction.set(matchRef, {
          users: [myUid, targetUid],
          // ✅ DENORMALIZATION: Save profiles here!
          profiles: {
            [myUid]: myProfile,
            [targetUid]: theirProfile
          },
          lastActivity: serverTimestamp(),
          timestamp: Date.now(),
          lastMsg: "New Match! Say Hello 👋",
          lastSenderId: "system",
          readStatus: { [myUid]: false, [targetUid]: false } // Granular read status
        });
        
        return { isMatch: true };
      }
      
      return { isMatch: false };
    });
  } catch (e) {
    console.error("Swipe Error:", e);
    return { isMatch: false };
  }
};

export const swipeLeft = async (myUid, targetUid) => {
  if (!myUid || !targetUid) return;
  try {
    await setDoc(doc(db, "passes", `${myUid}_${targetUid}`), {
        from: myUid,
        to: targetUid,
        timestamp: Date.now()
    });
  } catch (e) { console.error(e); }
};

export const unmatchUser = async (myUid, targetUid) => {
  const matchId = [myUid, targetUid].sort().join("_");
  try {
    await deleteDoc(doc(db, "matches", matchId));
    await deleteDoc(doc(db, "likes", `${myUid}_${targetUid}`));
    await deleteDoc(doc(db, "likes", `${targetUid}_${myUid}`));
    return true;
  } catch (e) { return true; }
};