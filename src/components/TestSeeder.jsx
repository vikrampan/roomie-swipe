import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase'; 
import { geohashForLocation } from 'geofire-common';

// ==========================================
// 15 DUMMY USERS (COMPLETE LIST)
// ==========================================
const DUMMY_USERS = [
  // --- GROUP A: HOSTS (Supply Side - Have Room) ---
  {
    id: "host_vikram",
    name: "Vikram Singh",
    age: "28",
    gender: "Male",
    userRole: "host",
    city: "Noida",
    lat: 28.6208, lng: 77.3639, // Sector 62
    rent: "15000",
    furnishing: "Semi-Furnished",
    societyName: "Shatabdi Vihar",
    images: ["https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400", "https://images.unsplash.com/photo-1522771753035-4839dd3a94f4?w=400"],
    bio: "Techie working in Cyber Hub. Chill vibes, need a cricket fan.",
    tags: ["Non-Smoker", "Vegetarian", "Early Bird"],
    email: "host.vikram@test.com"
  },
  {
    id: "host_priya",
    name: "Priya Sharma",
    age: "24",
    gender: "Female",
    userRole: "host",
    city: "Noida",
    lat: 28.5708, lng: 77.3258, // Sector 18
    rent: "18000",
    furnishing: "Fully Furnished",
    societyName: "Cleo County",
    images: ["https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400"],
    bio: "Fashion designer. Cleanliness is a absolute must.",
    tags: ["Pet Friendly", "Drinker", "Night Owl"],
    email: "host.priya@test.com"
  },
  {
    id: "host_rahul",
    name: "Rahul Verma",
    age: "26",
    gender: "Male",
    userRole: "host",
    city: "Noida",
    lat: 28.6258, lng: 77.3750, // Sector 63
    rent: "10000",
    furnishing: "Unfurnished",
    societyName: "Independent House",
    images: ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400", "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400"],
    bio: "Startup founder. Rarely at home. Just need someone to split rent.",
    tags: ["Smoker", "Non-Veg", "Workaholic"],
    email: "host.rahul@test.com"
  },
  {
    id: "host_amit",
    name: "Amit Patel",
    age: "30",
    gender: "Male",
    userRole: "host",
    city: "Noida",
    lat: 28.5900, lng: 77.3500, // Sector 50
    rent: "25000",
    furnishing: "Fully Furnished",
    societyName: "ATS Hamlet",
    images: ["https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400", "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400"],
    bio: "Finance professional. Looking for a decent roommate.",
    tags: ["Teetotaler", "Vegetarian"],
    email: "host.amit@test.com"
  },
  {
    id: "host_sneha",
    name: "Sneha Gupta",
    age: "23",
    gender: "Female",
    userRole: "host",
    city: "Noida",
    lat: 28.5800, lng: 77.3600, // Sector 76
    rent: "12000",
    furnishing: "Semi-Furnished",
    societyName: "Amrapali Silicon",
    images: ["https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400", "https://images.unsplash.com/photo-1505693314120-0d443867891e?w=400"],
    bio: "Masters student. Need a study-focused environment.",
    tags: ["Non-Smoker", "Early Bird", "Student"],
    email: "host.sneha@test.com"
  },

  // --- GROUP B: HUNTERS (Demand Side - Need Room) ---
  {
    id: "hunter_rohan",
    name: "Rohan Das",
    age: "22",
    gender: "Male",
    userRole: "hunter",
    city: "Noida",
    lat: 28.6210, lng: 77.3645, 
    rent: "12000",
    moveInDate: "2026-03-01",
    workLocation: "Sector 62",
    images: ["https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400"],
    bio: "Intern at HCL. Looking for a quiet place near office.",
    tags: ["Non-Smoker", "Student", "Gamer"],
    email: "hunter.rohan@test.com"
  },
  {
    id: "hunter_kavya",
    name: "Kavya Iyer",
    age: "25",
    gender: "Female",
    userRole: "hunter",
    city: "Noida",
    lat: 28.5710, lng: 77.3260, 
    rent: "20000",
    moveInDate: "2026-02-15",
    workLocation: "Sector 16",
    images: ["https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400"],
    bio: "Love dogs! Need a pet friendly place with good vibes.",
    tags: ["Pet Friendly", "Vegetarian", "Social"],
    email: "hunter.kavya@test.com"
  },
  {
    id: "hunter_arjun",
    name: "Arjun Reddy",
    age: "29",
    gender: "Male",
    userRole: "hunter",
    city: "Noida",
    lat: 28.6260, lng: 77.3760,
    rent: "30000",
    moveInDate: "2026-02-10",
    workLocation: "Remote",
    images: ["https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?w=400"],
    bio: "Digital Nomad. Need high-speed wifi and good coffee nearby.",
    tags: ["Drinker", "Night Owl", "Nomad"],
    email: "hunter.arjun@test.com"
  },
  {
    id: "hunter_zara",
    name: "Zara Khan",
    age: "24",
    gender: "Female",
    userRole: "hunter",
    city: "Noida",
    lat: 28.5810, lng: 77.3610,
    rent: "15000",
    moveInDate: "2026-02-20",
    workLocation: "Sector 135",
    images: ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"],
    bio: "Graphic Designer. Looking for an artistic space.",
    tags: ["Non-Veg", "Night Owl"],
    email: "hunter.zara@test.com"
  },
  {
    id: "hunter_dev",
    name: "Dev Kumar",
    age: "21",
    gender: "Male",
    userRole: "hunter",
    city: "Noida",
    lat: 28.6200, lng: 77.3600,
    rent: "8000",
    moveInDate: "2026-03-05",
    workLocation: "Sector 62",
    images: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"],
    bio: "Just need a bed. I'm barely there.",
    tags: ["Student", "Minimalist"],
    email: "hunter.dev@test.com"
  },

  // --- GROUP C: EDGE CASES (The Breakers) ---
  {
    id: "test_far_location",
    name: "Far Away Frank",
    age: "40",
    gender: "Male",
    userRole: "host",
    city: "Mumbai", // 1400km away
    lat: 19.0760, lng: 72.8777,
    rent: "45000",
    furnishing: "Fully Furnished",
    societyName: "Marine Drive",
    images: ["https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=400"],
    bio: "I should NOT appear in your feed if you are in Noida.",
    tags: ["Rich", "Luxury"],
    email: "test.far@test.com"
  },
  {
    id: "test_rich_guy",
    name: "Richie Rich",
    age: "27",
    gender: "Male",
    userRole: "hunter",
    city: "Noida",
    lat: 28.5355, lng: 77.3910,
    rent: "100000", // Extreme Budget
    moveInDate: "2026-02-01",
    workLocation: "Penthouse",
    images: ["https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400"],
    bio: "Budget is no issue. I want the best.",
    tags: ["Luxury", "Party"],
    email: "test.rich@test.com"
  },
  {
    id: "test_switcher",
    name: "Role Switcher",
    age: "25",
    gender: "Male",
    userRole: "host",
    city: "Noida",
    lat: 28.5355, lng: 77.3910,
    rent: "15000",
    furnishing: "Semi-Furnished",
    societyName: "Test Society",
    images: ["https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=400"],
    bio: "I might switch roles to test persistence.",
    tags: ["Test"],
    email: "test.switch@test.com"
  },
  {
    id: "test_ghost_user",
    name: "Ghost User",
    age: "99",
    gender: "Other",
    userRole: "hunter",
    city: "Noida",
    lat: 28.5355, lng: 77.3910,
    rent: "5000",
    moveInDate: "2030-01-01",
    workLocation: "Void",
    images: ["https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400"],
    bio: "Swipe left on me to test Pass logic.",
    tags: ["Ghost"],
    email: "test.ghost@test.com"
  },
  {
    id: "test_monitor_admin",
    name: "Admin Monitor",
    age: "30",
    gender: "Female",
    userRole: "hunter",
    city: "Noida",
    lat: 28.5355, lng: 77.3910,
    rent: "20000",
    moveInDate: "2026-02-01",
    workLocation: "HQ",
    images: ["https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400"],
    bio: "I am just here to watch.",
    tags: ["Admin"],
    email: "admin@test.com"
  }
];

export const TestSeeder = () => {
  const [status, setStatus] = useState("Idle");

  // --- FUNCTION 1: INJECT 15 USERS ---
  const runSeed = async () => {
    if (!window.confirm("Inject 15 Test Users? This will overwrite existing test data.")) return;
    
    setStatus("Seeding...");
    try {
      let count = 0;
      for (const user of DUMMY_USERS) {
        const hash = geohashForLocation([user.lat, user.lng]);
        
        // Add robust defaults
        const fullProfile = {
          ...user,
          geohash: hash,
          lastUpdated: Date.now(),
          isPhoneVerified: true,
          phoneNumber: "+919999999999", 
          cleanliness: "Moderate",
          guestPolicy: "Weekends",
          schedule: "9-5 Worker",
          socialVibe: "Friendly"
        };

        await setDoc(doc(db, "users", user.id), fullProfile);
        count++;
      }
      setStatus(`Success! Added ${count} users.`);
      setTimeout(() => setStatus("Idle"), 3000);
    } catch (e) {
      console.error(e);
      setStatus("Error: " + e.message);
    }
  };

  // --- FUNCTION 2: FORCE INCOMING LIKE (CHEAT MATCH) ---
  const forceIncomingLike = async () => {
    if (!auth.currentUser) {
      alert("Please login first!");
      return;
    }
    
    // We will force 'host_vikram' to like YOU
    const myUid = auth.currentUser.uid;
    const fakeUserId = "host_vikram"; // Must match an ID in DUMMY_USERS

    setStatus("Forcing Like...");
    try {
      // Create the "Like" document: FROM Vikram -> TO Me
      // This tricks the system into thinking Vikram swiped right on you yesterday.
      const likeId = `${fakeUserId}_${myUid}`; 
      
      await setDoc(doc(db, "likes", likeId), {
        from: fakeUserId,
        to: myUid,
        timestamp: Date.now()
      });

      alert(`✅ DONE! 'Vikram Singh' has now Liked you.\n\nNow find him in the feed and Swipe Right to trigger the Match Popup!`);
      setStatus("Idle");
    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
      setStatus("Error");
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-[9999] flex flex-col gap-2">
      {/* Button 1: Inject Data */}
      <button 
        onClick={runSeed} 
        disabled={status !== "Idle"}
        className={`px-4 py-2 rounded-full font-bold shadow-xl text-xs transition-all ${
          status === "Idle" 
            ? "bg-red-600 text-white hover:bg-red-700 hover:scale-105" 
            : "bg-gray-800 text-gray-400 cursor-not-allowed"
        }`}
      >
        {status === "Idle" ? "⚡ Inject 15 Test Users" : status}
      </button>

      {/* Button 2: Force Match */}
      <button 
        onClick={forceIncomingLike} 
        disabled={status !== "Idle"}
        className="px-4 py-2 rounded-full font-bold shadow-xl text-xs bg-purple-600 text-white hover:bg-purple-700 animate-pulse hover:scale-105 transition-all"
      >
        💜 Force 'Vikram' Like
      </button>
    </div>
  );
};