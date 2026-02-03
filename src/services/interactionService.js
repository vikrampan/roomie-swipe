import { doc, runTransaction, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore'; 
import { db } from '../firebase';

// --- HELPER: Get Minimal Profile for Match List ---
const getProfileSnapshot = async (uid) => {
    try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
            const data = snap.data();
            
            let displayImage = "https://via.placeholder.com/150";

            if (data.userRole === 'host' && data.roomImages && data.roomImages.length > 0) {
                displayImage = data.roomImages[0]; 
            } else if (data.images && data.images.length > 0) {
                displayImage = data.images[0]; 
            } else if (data.img) {
                displayImage = data.img; 
            }

            return { 
                name: data.name || "Unknown", 
                img: displayImage,
                userRole: data.userRole || "hunter", 
                city: data.city || ""
            };
        }
    } catch (e) {
        console.warn("Profile snapshot fetch failed", e);
    }
    return { name: "Unknown", img: "https://via.placeholder.com/150" };
};

// --- 1. SWIPE RIGHT (LIKE) ---
export const swipeRight = async (myUid, targetUid) => {
  if (!myUid || !targetUid) return { isMatch: false };

  // Match ID (Alphabetical Order ensuring unique ID for the pair)
  const matchId = [myUid, targetUid].sort().join("_");
  
  // Interaction IDs
  const myInteractionId = `${myUid}_${targetUid}`;
  const theirInteractionId = `${targetUid}_${myUid}`;

  try {
    // 1. Pre-fetch profiles
    const myProfile = await getProfileSnapshot(myUid);
    const theirProfile = await getProfileSnapshot(targetUid);

    return await runTransaction(db, async (transaction) => {
      // 2. Check if they ALREADY liked us (Look in 'interactions' collection)
      const reverseLikeRef = doc(db, "interactions", theirInteractionId);
      const reverseLikeSnap = await transaction.get(reverseLikeRef);

      // Check if the reverse document exists AND is a like
      const isMatch = reverseLikeSnap.exists() && reverseLikeSnap.data().type === 'like';

      // 3. Record OUR like in the 'interactions' database
      const likeRef = doc(db, "interactions", myInteractionId);
      transaction.set(likeRef, {
        fromUserId: myUid, // Changed from 'from' to 'fromUserId' to match Vault logic
        toUserId: targetUid, // Changed from 'to' to 'toUserId' to match Vault logic
        type: 'like',
        timestamp: serverTimestamp(),
        isMatch: isMatch,
        isRevealed: false // CRITICAL: Starts locked for the other person
      });

      // 4. IF IT IS A MATCH (Mutual Like)
      if (isMatch) {
        const matchRef = doc(db, "matches", matchId);
        
        transaction.set(matchRef, {
          users: [myUid, targetUid], 
          profiles: {
            [myUid]: myProfile,
            [targetUid]: theirProfile
          },
          lastActivity: serverTimestamp(),
          timestamp: Date.now(),
          lastMsg: "It's a Match! Say hello 👋",
          lastSenderId: "system",
          readStatus: { [myUid]: false, [targetUid]: false } 
        });
        
        return { isMatch: true, matchData: theirProfile };
      }
      
      return { isMatch: false };
    });
  } catch (e) {
    console.error("Swipe Error:", e);
    return { isMatch: false };
  }
};

// --- 2. SWIPE LEFT (PASS) ---
export const swipeLeft = async (myUid, targetUid) => {
  if (!myUid || !targetUid) return;
  try {
    // Record the pass in 'interactions' so we don't show them again
    // UPDATED: Writing to 'interactions' instead of 'passes'
    const interactionId = `${myUid}_${targetUid}`;
    await setDoc(doc(db, "interactions", interactionId), {
        fromUserId: myUid,
        toUserId: targetUid,
        type: 'nope',
        timestamp: serverTimestamp()
    });
    return { success: true };
  } catch (e) { 
    console.error("Pass Error:", e); 
  }
};

// --- 3. UNMATCH ---
export const unmatchUser = async (myUid, targetUid) => {
  if (!myUid || !targetUid) return false;
  
  const matchId = [myUid, targetUid].sort().join("_");
  
  try {
    // 1. Delete the match conversation
    await deleteDoc(doc(db, "matches", matchId));
    
    // 2. Delete BOTH interactions
    // UPDATED: Deleting from 'interactions' instead of 'likes'
    await deleteDoc(doc(db, "interactions", `${myUid}_${targetUid}`));
    await deleteDoc(doc(db, "interactions", `${targetUid}_${myUid}`));
    
    return true;
  } catch (e) { 
    console.error("Unmatch Error:", e);
    return false; 
  }
};