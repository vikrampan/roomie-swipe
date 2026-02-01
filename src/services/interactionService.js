import { doc, runTransaction, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore'; 
import { db } from '../firebase';

// --- HELPER: Get Minimal Profile for Match List ---
// This ensures the Match List shows the correct photo (Room vs Face)
// and saves a "snapshot" so the chat loads instantly without extra reads.
const getProfileSnapshot = async (uid) => {
    try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
            const data = snap.data();
            
            // LOGIC: If they are a Host, show Room Photo. If Hunter, show Face.
            let displayImage = "https://via.placeholder.com/150";

            if (data.userRole === 'host' && data.roomImages && data.roomImages.length > 0) {
                displayImage = data.roomImages[0]; // Show Room
            } else if (data.images && data.images.length > 0) {
                displayImage = data.images[0]; // Show Face
            } else if (data.img) {
                displayImage = data.img; // Fallback
            }

            return { 
                name: data.name || "Unknown", 
                img: displayImage,
                userRole: data.userRole || "hunter", // Useful for UI logic later
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

  // Generate Match ID (Always sorted alphabetically so A->B and B->A produce same ID)
  const matchId = [myUid, targetUid].sort().join("_");

  try {
    // 1. Pre-fetch profiles (Read before Write rule for efficiency)
    // We do this outside the transaction to keep the DB lock time short.
    const myProfile = await getProfileSnapshot(myUid);
    const theirProfile = await getProfileSnapshot(targetUid);

    return await runTransaction(db, async (transaction) => {
      // 2. Check if they ALREADY liked us
      const reverseLikeRef = doc(db, "likes", `${targetUid}_${myUid}`);
      const reverseLikeSnap = await transaction.get(reverseLikeRef);

      // 3. Record OUR like in the database
      const likeRef = doc(db, "likes", `${myUid}_${targetUid}`);
      transaction.set(likeRef, {
        from: myUid,
        to: targetUid,
        timestamp: Date.now()
      });

      // 4. CHECK FOR MATCH (Mutual Like)
      if (reverseLikeSnap.exists()) {
        const matchRef = doc(db, "matches", matchId);
        
        // Create the Match Document
        transaction.set(matchRef, {
          users: [myUid, targetUid], // Array for querying "matches where array-contains myUid"
          
          // Denormalized Profiles (Saves reads later!)
          profiles: {
            [myUid]: myProfile,
            [targetUid]: theirProfile
          },
          
          lastActivity: serverTimestamp(),
          timestamp: Date.now(),
          
          // Initial System Message
          lastMsg: "It's a Match! Say hello 👋",
          lastSenderId: "system",
          
          // Unread Indicators
          readStatus: { [myUid]: false, [targetUid]: false } 
        });
        
        // Return match data so the UI can show the popup
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
    // Just record the pass so we don't show them again
    await setDoc(doc(db, "passes", `${myUid}_${targetUid}`), {
        from: myUid,
        to: targetUid,
        timestamp: Date.now()
    });
  } catch (e) { 
    console.error("Pass Error:", e); 
  }
};

// --- 3. UNMATCH ---
export const unmatchUser = async (myUid, targetUid) => {
  if (!myUid || !targetUid) return false;
  
  const matchId = [myUid, targetUid].sort().join("_");
  
  try {
    // Delete the match conversation
    await deleteDoc(doc(db, "matches", matchId));
    
    // Delete BOTH likes so they don't rematch instantly
    await deleteDoc(doc(db, "likes", `${myUid}_${targetUid}`));
    await deleteDoc(doc(db, "likes", `${targetUid}_${myUid}`));
    
    // Optional: Add to 'blocked' collection if you want to ban them permanently
    // await setDoc(doc(db, "blocks", `${myUid}_${targetUid}`), { timestamp: Date.now() });

    return true;
  } catch (e) { 
    console.error("Unmatch Error:", e);
    return false; 
  }
};