import { Truck, Armchair, Wifi, Zap, Star } from 'lucide-react';

export const AD_INVENTORY = {
  // 1. HIGH TICKET (Furniture)
  premiumFurniture: {
    id: "ad_prem_fur",
    name: "Furlenco Gold",
    img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80",
    title: "Upgrade Your Vibe",
    desc: "Get the UNLMTD furniture package. Zero cost EMI.",
    link: "https://www.furlenco.com/", 
    Icon: Armchair, // Pass Component Name (No < >)
    iconColor: "text-yellow-400",
    cta: "View Packages"
  },
  budgetFurniture: {
    id: "ad_bud_fur",
    name: "CityFurnish",
    img: "https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=400&q=80",
    title: "Just the Basics?",
    desc: "Rent a bed & mattress starting at just ₹199/mo.",
    link: "https://cityfurnish.com/", 
    Icon: Armchair,
    iconColor: "text-orange-400",
    cta: "Rent Now"
  },
  
  // 2. SERVICES (Packers & Movers)
  packers: {
    id: "ad_porter",
    name: "Porter Movers",
    img: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=400&q=80",
    title: "Moving Day?",
    desc: "Get 15% off your move with code ROOMIE15.",
    link: "https://porter.in/", 
    Icon: Truck,
    iconColor: "text-blue-400",
    cta: "Get Quote"
  },

  // 3. UTILITIES (Wi-Fi)
  wifi: {
    id: "ad_airtel",
    name: "Airtel Xstream",
    img: "https://images.unsplash.com/photo-1544197150-b99a580bbcbf?auto=format&fit=crop&w=400&q=80",
    title: "Need High Speed?",
    desc: "Free installation + 1 month free router.",
    link: "https://www.airtel.in/broadband/", 
    Icon: Wifi,
    iconColor: "text-pink-500",
    cta: "Check Availability"
  },

  // 4. NICHE (Host Specific)
  cleaning: {
    id: "ad_uc",
    name: "Urban Company",
    img: "https://images.unsplash.com/photo-1581578731117-104f2a41272c?auto=format&fit=crop&w=400&q=80",
    title: "Sparkling Clean",
    desc: "Deep clean your room before the new tenant arrives.",
    link: "https://www.urbancompany.com/", 
    Icon: Zap,
    iconColor: "text-yellow-400",
    cta: "Book Cleaning"
  }
};