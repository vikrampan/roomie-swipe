import { Truck, Armchair, Wifi, Zap, Star, Utensils, ShoppingBag, Home } from 'lucide-react';

export const AD_INVENTORY = {
  // 1. HIGH TICKET (Furniture)
  premiumFurniture: {
    id: "ad_prem_fur",
    name: "Furlenco Gold",
    img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80",
    title: "Upgrade Your Vibe",
    desc: "Get the UNLMTD furniture package. Zero cost EMI.",
    link: "https://www.furlenco.com/", 
    Icon: Armchair, 
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
  },

  // --- NEW ADS ADDED BELOW ---

  // 5. FOOD (Bachelor Life)
  foodDelivery: {
    id: "ad_swiggy",
    name: "Swiggy",
    img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80",
    title: "Hungry?",
    desc: "Get 50% off your first order. No cooking today!",
    link: "https://www.swiggy.com/",
    Icon: Utensils,
    iconColor: "text-orange-500",
    cta: "Order Now"
  },

  // 6. GROCERY (Quick Commerce)
  quickGrocery: {
    id: "ad_blinkit",
    name: "Blinkit",
    img: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80",
    title: "Groceries in 10m",
    desc: "Forgot to buy milk? We've got you covered.",
    link: "https://blinkit.com/",
    Icon: ShoppingBag,
    iconColor: "text-green-500",
    cta: "Shop Now"
  },

  // 7. CO-LIVING (Competitor/Alternative)
  coliving: {
    id: "ad_zolo",
    name: "Zolo Stays",
    img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80",
    title: "Hassle Free Stay",
    desc: "Fully managed rooms with food & housekeeping.",
    link: "https://zolostays.com/",
    Icon: Home,
    iconColor: "text-indigo-400",
    cta: "Explore Rooms"
  }
};