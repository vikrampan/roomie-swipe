import { doc, runTransaction, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore'; 
import { db } from '../firebase';

// --- HELPER: Get Minimal Profile Snapshot (The "Fast-Read" Data) ---
const getProfileSnapshot = async (uid) => {
    try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
            const data = snap.data();
            
            // Priority for display image: Room (if Host) > Personal > Fallback
            let displayImage = "https://via.placeholder.com/150";

            if (data.userRole === 'host' && data.roomImages && data.roomImages.length > 0) {
                displayImage = data.roomImages[0]; 
            } else if (data.images && data.images.length > 0) {
                displayImage = data.images[0]; 
            } else if (data.img) {
                displayImage = data.img; 
            }

            // This object is what gets "Denormalized" into the interaction document
            return { 
                uid: uid,
                name: data.name || "Unknown", 
                age: data.age || "?",
                img: displayImage,
                userRole: data.userRole || "hunter", 
                occupation: data.occupation || "Student",
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

  // Unique ID for the Match pair (Alphabetical Order)
  const matchId = [myUid, targetUid].sort().join("_");
  
  // Interaction IDs
  const myInteractionId = `${myUid}_${targetUid}`;
  const theirInteractionId = `${targetUid}_${myUid}`;

  try {
    // 1. Pre-fetch profiles to store in the 'like' document (Denormalization)
    const myProfileSnapshot = await getProfileSnapshot(myUid);
    const theirProfileSnapshot = await getProfileSnapshot(targetUid);

    return await runTransaction(db, async (transaction) => {
      // 2. Check if they ALREADY liked us
      const reverseLikeRef = doc(db, "interactions", theirInteractionId);
      const reverseLikeSnap = await transaction.get(reverseLikeRef);

      const isMatch = reverseLikeSnap.exists() && reverseLikeSnap.data().type === 'like';

      // 3. Record OUR like with Denormalized Data for Fast Loading
      const likeRef = doc(db, "interactions", myInteractionId);
      transaction.set(likeRef, {
        fromUserId: myUid,
        toUserId: targetUid,
        fromData: myProfileSnapshot, // ✅ DENORMALIZED: Stores my info in the like doc
        type: 'like',
        timestamp: serverTimestamp(),
        isMatch: isMatch,
        isRevealed: false 
      });

      // 4. IF IT IS A MATCH (Mutual Like)
      if (isMatch) {
        const matchRef = doc(db, "matches", matchId);
        
        transaction.set(matchRef, {
          users: [myUid, targetUid], 
          profiles: {
            [myUid]: myProfileSnapshot,
            [targetUid]: theirProfileSnapshot
          },
          lastActivity: serverTimestamp(),
          timestamp: Date.now(),
          lastMsg: "It's a Match! Say hello 👋",
          lastSenderId: "system",
          readStatus: { [myUid]: false, [targetUid]: false } 
        });

        // Update their interaction document to reflect the match status
        transaction.update(reverseLikeRef, { isMatch: true });
        
        return { isMatch: true, matchData: theirProfileSnapshot };
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
    
    // 2. Delete BOTH interactions to reset the swipe state
    await deleteDoc(doc(db, "interactions", `${myUid}_${targetUid}`));
    await deleteDoc(doc(db, "interactions", `${targetUid}_${myUid}`));
    
    return true;
  } catch (e) { 
    console.error("Unmatch Error:", e);
    return false; 
  }
};