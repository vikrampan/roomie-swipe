import React, { useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase'; 
import { geohashForLocation } from 'geofire-common';

// ✅ CHANGED: Defined as a const first
const PuneSeeder = () => {

  useEffect(() => {
    const seedDatabase = async () => {
      console.log("🚀 STARTING PUNE SEED OPERATION...");

      const CENTER_LAT = 18.5362;
      const CENTER_LNG = 73.8940;

      const maleNames = ["Aarav", "Vihaan", "Aditya", "Sai", "Reyansh", "Arjun", "Kabir", "Rohan", "Ishaan", "Vivaan", "Vikram", "Rahul", "Sarthak", "Pranav", "Dhruv", "Ankit", "Manish", "Karan", "Nikhil", "Rishabh", "Sameer", "Varun", "Yash", "Zaid", "Harsh"];
      const femaleNames = ["Saanvi", "Anya", "Diya", "Pari", "Ananya", "Myra", "Riya", "Aadhya", "Kiara", "Isha", "Priya", "Sneha", "Kavya", "Neha", "Pooja", "Anjali", "Meera", "Zara", "Naina", "Sana", "Tanvi", "Shruti", "Roshni", "Kritika", "Simran"];

      const bios = [
        "Software Engineer at Infosys. Working in Hinjewadi. Need a chill flatmate.",
        "Student at Symbiosis Viman Nagar. Looking for a shared room nearby.",
        "Marketing Manager. I travel a lot. Need a clean and quiet place.",
        "New to Pune! Love exploring cafes in KP. Let's hunt for a flat together.",
        "Working in Magarpatta City. Early bird, non-smoker.",
        "MBA Student. Need a place near SB Road. Budget is flexible.",
        "Freelance Designer. I work from home, so good WiFi is a must!",
        "Fitness freak. Looking for a flat in a society with a gym.",
        "Just moved from Mumbai. Looking for a 2BHK in Kalyani Nagar.",
        "Doctor at Ruby Hall Clinic. Need a place close to the hospital.",
        "Civil Engineer. mostly on site. Need a place to crash on weekends.",
        "Startup founder. We can turn the living room into a co-working space!",
        "Gamer and Coder. Night owl. Need soundproof walls :P",
        "Foodie. I cook great Butter Chicken on weekends. You clean, I cook?",
        "Simple person. 9-5 job. clean habits. No drama."
      ];

      const roles = ["hunter", "host"]; 

      for (let i = 0; i < 50; i++) {
        const isMale = Math.random() > 0.5;
        const nameList = isMale ? maleNames : femaleNames;
        const name = nameList[Math.floor(Math.random() * nameList.length)] + " " + String.fromCharCode(65 + Math.floor(Math.random() * 26)); 
        
        const imageId = Math.floor(Math.random() * 90) + 1; 
        const genderPath = isMale ? "men" : "women";
        const photoURL = `https://randomuser.me/api/portraits/${genderPath}/${imageId}.jpg`;

        const latOffset = (Math.random() - 0.5) * 0.08; 
        const lngOffset = (Math.random() - 0.5) * 0.08;
        const lat = CENTER_LAT + latOffset;
        const lng = CENTER_LNG + lngOffset;

        const geohash = geohashForLocation([lat, lng]);

        const role = roles[Math.floor(Math.random() * roles.length)];
        const age = Math.floor(Math.random() * (32 - 21 + 1)) + 21; 
        const budget = (Math.floor(Math.random() * (25 - 8 + 1)) + 8) * 1000; 
        
        const uid = `seed_pune_${i}`;
        
        const userData = {
          uid: uid,
          displayName: name,
          firstName: name.split(' ')[0], 
          email: `seeduser${i}@roomieswipe.test`,
          photoURL: photoURL,
          images: [photoURL], 
          bio: bios[Math.floor(Math.random() * bios.length)],
          age: age,
          gender: isMale ? "Male" : "Female",
          userRole: role, 
          budget: `${budget}`,
          lat: lat,
          lng: lng,
          geohash: geohash,
          locationName: "Pune, Maharashtra",
          isSeedProfile: true, 
          createdAt: new Date(),
          lastActive: new Date()
        };

        try {
          await setDoc(doc(db, "users", uid), userData);
          console.log(`✅ Created User ${i + 1}: ${name} (${role})`);
        } catch (error) {
          console.error("Error creating user:", error);
        }
      }

      console.log("🎉🎉🎉 SEEDING COMPLETE! 50 PUNE USERS ADDED. 🎉🎉🎉");
      alert("Seeding Complete! Check your Firestore.");
    };

    seedDatabase();

  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black/80 text-white flex items-center justify-center z-[9999]">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">🌱 Seeding Database...</h1>
        <p className="text-xl">Check Console for Progress.</p>
        <p className="text-sm text-red-400 mt-4">DO NOT CLOSE THIS TAB UNTIL ALERT APPEARS.</p>
      </div>
    </div>
  );
};

// ✅ CHANGED: Using export default at the bottom
export default PuneSeeder;