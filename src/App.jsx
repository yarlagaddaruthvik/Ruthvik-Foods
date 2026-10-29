
import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./Login.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import foodData from "./foodData.json";
import {
  Search, ShoppingCart, Heart, Star, MapPin, Clock,
  ChevronRight, Menu, X, Plus, Minus, Utensils,
  Truck, ShieldCheck, Tag, ArrowRight, Trash2,
  Flame, Sparkles, ChefHat, PackageCheck, LocateFixed
} from "lucide-react";
import "./App.css";
import "./OrdersPage.css";

/* ================= IMAGE HANDLING ================= */

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=700&q=80";

function SafeImage({ src, alt, className, width = 650 }) {
  const [stage, setStage] = useState(0);

  const imageSrc = stage === 0
    ? `https://images.unsplash.com/${src}?auto=format&fit=crop&w=${width}&q=85`
    : FALLBACK_IMAGE;

  if (stage >= 2) {
    return (
      <div
        className={`${className || ""} image-placeholder`}
        role="img"
        aria-label={alt}
      >
        <span>🍽️</span>
        <small>{alt}</small>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={imageSrc}
      alt={alt}
      loading="lazy"
      onError={() => setStage((current) => current + 1)}
    />
  );
}







function distanceKm(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const { categories, restaurants, foods } = foodData;

const CURRENT_USER_KEY = "ruthvik_foods_current_user";
const ORDERS_KEY = "ruthvik_foods_orders";

function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem(CURRENT_USER_KEY) || "null");
  } catch {
    return null;
  }
}

function getUserStorageKey(type, user = getStoredUser()) {
  const email = (user?.email || "guest").toLowerCase();
  return `ruthvik_foods_${type}:${email}`;
}

function readUserStorage(type, fallback) {
  try {
    const saved = localStorage.getItem(getUserStorageKey(type));
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

/* ================= MAIN APP ================= */

function Home() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState(() => readUserStorage("cart", []));
  const [wishlist, setWishlist] = useState(() => readUserStorage("wishlist", []));
  const [showCart, setShowCart] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [showAll, setShowAll] = useState(false);
  const [location, setLocation] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [locationFilter, setLocationFilter] = useState({ mode: "none", query: "", coords: null });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!currentUser?.email) return;
    localStorage.setItem(getUserStorageKey("cart", currentUser), JSON.stringify(cart));
  }, [cart, currentUser]);

  useEffect(() => {
    if (!currentUser?.email) return;
    localStorage.setItem(getUserStorageKey("wishlist", currentUser), JSON.stringify(wishlist));
  }, [wishlist, currentUser]);

  const notify = (message) => {
    setNotice(message);
    window.clearTimeout(window.__ruthvikToast);
    window.__ruthvikToast = window.setTimeout(() => setNotice(""), 2600);
  };

  const filteredFoods = useMemo(() => foods.filter((food) => {
    const categoryMatch =
      activeCategory === "All" || food.category === activeCategory;

    const term = search.trim().toLowerCase();
    const searchMatch =
      !term ||
      food.name.toLowerCase().includes(term) ||
      food.restaurant.toLowerCase().includes(term) ||
      food.category.toLowerCase().includes(term);

    return categoryMatch && searchMatch;
  }), [activeCategory, search]);

  const filteredRestaurants = restaurants
    .map((restaurant) => {
      if (locationFilter.mode !== "nearby" || !locationFilter.coords) {
        return { ...restaurant, distanceFromUser: null };
      }
      const distance = distanceKm(
        locationFilter.coords.latitude,
        locationFilter.coords.longitude,
        restaurant.latitude,
        restaurant.longitude
      );
      return { ...restaurant, distanceFromUser: distance };
    })
    .filter((restaurant) => {
      const term = search.trim().toLowerCase();
      const searchMatch = !term ||
        restaurant.name.toLowerCase().includes(term) ||
        restaurant.cuisine.toLowerCase().includes(term) ||
        (restaurant.area || "").toLowerCase().includes(term);

      let locationMatch = true;
      if (locationFilter.mode === "manual" && locationFilter.query) {
        const query = locationFilter.query;
        const searchableLocation = `${restaurant.area || ""} ${restaurant.city || ""} ${restaurant.address || ""}`.toLowerCase();
        locationMatch = searchableLocation.includes(query) || query.includes((restaurant.city || "").toLowerCase());
      } else if (locationFilter.mode === "nearby" && locationFilter.coords) {
        locationMatch = restaurant.distanceFromUser <= (restaurant.deliveryRadiusKm || 15);
      }

      return searchMatch && locationMatch;
    })
    .sort((a, b) => {
      if (locationFilter.mode === "nearby") {
        return (a.distanceFromUser ?? Infinity) - (b.distanceFromUser ?? Infinity);
      }
      return 0;
    });

  const findMyLocation = () => {
    if (!navigator.geolocation) {
      notify("Your browser does not support location access. Enter your area manually.");
      return;
    }

    notify("Finding your location… please allow location access.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocationFilter({ mode: "nearby", query: "", coords });
        setLocation("Current location");
        notify("Location found! Showing nearby restaurants within their delivery area.");
        setTimeout(() => scrollTo("restaurants"), 100);
      },
      (error) => {
        const message = error.code === 1
          ? "Location permission denied. Allow it in browser settings or enter your area manually."
          : "Could not detect your location. Try again or enter your area manually.";
        notify(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal === 0 || subtotal >= 499 ? 0 : 30;
  const total = subtotal + deliveryFee;

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setMobileMenu(false);
  };

  const selectCategory = (name) => {
    setActiveCategory(name);
    setShowAll(false);
    scrollTo("menu");
  };

  const requireLogin = (message = "Please login to continue.") => {
    if (!currentUser) {
      notify(message);
      navigate("/login", { state: { from: "/" } });
      return false;
    }
    return true;
  };

  const addToCart = (food) => {
    if (!requireLogin("Please login before adding food to your cart.")) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === food.id);
      if (existing) {
        return prev.map((item) =>
          item.id === food.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...food, quantity: 1 }];
    });
    notify(`${food.name} added to your cart!`);
  };

  const handleOrderNow = (food) => {
    if (!requireLogin("Please login before ordering food.")) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === food.id);
      if (existing) {
        return prev.map((item) =>
          item.id === food.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...food, quantity: 1 }];
    });

    setShowCart(true);
    notify(`${food.name} added to your cart!`);
  };

  const updateQuantity = (id, change) => {
    setCart((prev) => prev
      .map((item) => item.id === id
        ? { ...item, quantity: item.quantity + change }
        : item)
      .filter((item) => item.quantity > 0));
  };

  const toggleWishlist = (id) => {
    if (!requireLogin("Please login to save your favorites.")) return;
    const wasSaved = wishlist.includes(id);
    setWishlist((prev) => wasSaved
      ? prev.filter((item) => item !== id)
      : [...prev, id]);
    notify(wasSaved ? "Removed from wishlist" : "Added to wishlist ❤️");
  };

  const handleCheckout = () => {
    if (!requireLogin("Please login before checkout.")) return;
    if (!cart.length) {
      notify("Your cart is empty!");
      return;
    }
    if (!deliveryAddress.trim()) {
      notify("Please enter your delivery address before checkout.");
      return;
    }

    const order = {
      id: `RF${Date.now()}`,
      userId: currentUser?.id || currentUser?.email,
      customerName: currentUser?.name || "Customer",
      customerEmail: currentUser?.email || "",
      items: cart.map((item) => ({ ...item })),
      subtotal,
      deliveryFee,
      total,
      address: deliveryAddress.trim(),
      status: "Placed",
      paymentMethod: "Cash on Delivery (Demo)",
      createdAt: new Date().toISOString(),
    };

    try {
      const existingOrders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
      localStorage.setItem(ORDERS_KEY, JSON.stringify([order, ...existingOrders]));
      setCart([]);
      localStorage.setItem(getUserStorageKey("cart", currentUser), JSON.stringify([]));
      setShowCart(false);
      notify(`Order placed successfully! Order ID: ${order.id}`);
      navigate("/orders");
    } catch {
      notify("Could not save the order. Please check browser storage.");
    }
  };

  return (
    <div className="app" id="home">
      <div className="top-strip">
        <span>🍊 Fresh food, happy mood!</span>
        <span><Truck size={14} /> Fast delivery at your doorstep</span>
      </div>

      <header className="navbar">
        <a href="#home" className="brand" onClick={(e) => {
          e.preventDefault();
          scrollTo("home");
        }}>
          <span className="brand-icon"><Utensils size={25} /></span>
          <span>Ruthvik <b>Foods</b></span>
        </a>

        <button className="mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">
          {mobileMenu ? <X /> : <Menu />}
        </button>

        <nav className={mobileMenu ? "nav-links open" : "nav-links"}>
          <button className="nav-link active" onClick={() => scrollTo("home")}>Home</button>
          <button className="nav-link" onClick={() => scrollTo("restaurants")}>Restaurants</button>
          <button className="nav-link" onClick={() => scrollTo("offers")}>Offers</button>
          <button className="nav-link" onClick={() => currentUser ? navigate("/orders") : navigate("/login", { state: { from: "/orders" } })}>My Orders</button>
        </nav>

        <label className="nav-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowAll(false);
            }}
            placeholder="Search food or restaurants..."
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </label>

        <button className="cart-button" onClick={() => { if (requireLogin("Please login to open your cart.")) setShowCart(true); }} aria-label="Open cart">
          <ShoppingCart size={23} />
          <span className="cart-badge">{cartCount}</span>
        </button>
        {currentUser ? (
          <button className="login-button" onClick={() => {
            sessionStorage.removeItem(CURRENT_USER_KEY);
            setCurrentUser(null);
            setCart([]);
            setWishlist([]);
            setShowCart(false);
            notify("You have logged out successfully.");
          }}>Logout</button>
        ) : (
          <button className="login-button" onClick={() => navigate("/login")}>Login</button>
        )}
      </header>

      <main>
        <section className="hero">
          <div className="hero-overlay" />
          <div className="hero-content">
            <span className="eyebrow"><Sparkles size={15} /> FRESH FOOD, HAPPY MOOD</span>
            <h1>Good Food.<br /><span>Great Moments.</span></h1>
            <p>Discover your favorite flavors, explore amazing restaurants, and get delicious food delivered fresh to your doorstep.</p>

            <form className="location-search" onSubmit={(e) => {
              e.preventDefault();
              const query = location.trim().toLowerCase();
              if (!query) {
                notify("Enter your area/city or choose Use My Location.");
                return;
              }
              setLocationFilter({ mode: "manual", query, coords: null });
              notify(`Finding restaurants near ${location}…`);
              setTimeout(() => scrollTo("restaurants"), 100);
            }}>
              <MapPin size={21} />
              <input
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  if (locationFilter.mode === "nearby") {
                    setLocationFilter({ mode: "none", query: "", coords: null });
                  }
                }}
                placeholder="Enter area or city (e.g. Labbipet)"
              />
              <button type="submit">Find Food <ArrowRight size={17} /></button>
            </form>
            <button type="button" className="use-location-button" onClick={findMyLocation}>
              <LocateFixed size={17} /> Use My Current Location
            </button>
            {locationFilter.mode === "nearby" && (
              <p className="location-status">Showing restaurants sorted by distance from your current location.</p>
            )}

            <div className="hero-benefits">
              <div><span className="benefit-icon"><Truck /></span><p><b>Fast Delivery</b><small>Fresh at your door</small></p></div>
              <div><span className="benefit-icon"><ShieldCheck /></span><p><b>Quality Food</b><small>Made with care</small></p></div>
              <div><span className="benefit-icon"><Tag /></span><p><b>Great Offers</b><small>More taste, less price</small></p></div>
            </div>
          </div>
          <div className="hero-sticker">Eat Well.<br /><span>Live Happy!</span> ♥</div>
        </section>

        <div className="page-content">
          <section className="section category-section">
            <div className="section-heading">
              <div><span className="section-kicker">FIND YOUR FAVORITE</span><h2>Explore Categories</h2></div>
              <button className="text-link" onClick={() => selectCategory("All")}>View All <ArrowRight size={17} /></button>
            </div>
            <div className="categories">
              {categories.map((category) => (
                <button key={category.name} className={`category-item ${activeCategory === category.name ? "selected" : ""}`} onClick={() => selectCategory(category.name)}>
                  <span className="category-emoji">{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="section" id="restaurants">
            <div className="section-heading">
              <div>
                <span className="section-kicker">GOOD FOOD STARTS HERE</span>
                <h2>{locationFilter.mode === "nearby" ? "Restaurants Near Me" : locationFilter.mode === "manual" ? `Restaurants near ${location}` : "Popular Restaurants"}</h2>
                <p className="section-description">{locationFilter.mode === "nearby" ? "Closest available demo locations first." : locationFilter.mode === "manual" ? "Matching restaurants for your selected area." : "Explore restaurants and their delivery locations."}</p>
              </div>
              <div className="restaurant-heading-actions">
                {locationFilter.mode !== "none" && (
                  <button className="text-link" onClick={() => {
                    setLocationFilter({ mode: "none", query: "", coords: null });
                    setLocation("");
                  }}>Show All Restaurants <X size={15} /></button>
                )}
                <button className="text-link" onClick={() => scrollTo("menu")}>Explore Menu <ArrowRight size={17} /></button>
              </div>
            </div>

            <div className="restaurant-grid">
              {filteredRestaurants.map((restaurant) => (
                <article className="restaurant-card" key={restaurant.id}>
                  <div className="restaurant-image">
                    <SafeImage src={restaurant.image} alt={restaurant.name} width={800} />
                    <span className="offer-tag">{restaurant.offer}</span>
                    <button className="heart-button" onClick={() => toggleWishlist(`r${restaurant.id}`)} aria-label="Save restaurant">
                      <Heart size={21} fill={wishlist.includes(`r${restaurant.id}`) ? "#ff642d" : "none"} color={wishlist.includes(`r${restaurant.id}`) ? "#ff642d" : "#fff"} />
                    </button>
                  </div>
                  <div className="restaurant-info">
                    <h3>{restaurant.name}</h3>
                    <div className="rating-line"><Star size={15} fill="#ff9d27" color="#ff9d27" /> <b>{restaurant.rating}</b><span>({restaurant.reviews})</span></div>
                    <p>{restaurant.cuisine}</p>
                    <p className="restaurant-address"><MapPin size={14} /> {restaurant.address || `${restaurant.area || "Local area"}, ${restaurant.city || "India"}`}</p>
                    {locationFilter.mode === "nearby" && restaurant.distanceFromUser != null && (
                      <p className="restaurant-distance">{restaurant.distanceFromUser.toFixed(1)} km away</p>
                    )}
                    <div className="restaurant-meta"><span><Clock size={14} /> {restaurant.time}</span><span>Delivery available</span></div>
                    <button className="restaurant-menu-link" onClick={() => {
                      setSearch("");
                      scrollTo("menu");
                    }}>View dishes <ArrowRight size={15} /></button>
                  </div>
                </article>
              ))}
              {filteredRestaurants.length === 0 && <p className="empty-state">No restaurants found for this location. Try Vijayawada, Labbipet, Benz Circle, Governorpet, Moghalrajpuram, Patamata, or Auto Nagar.</p>}
            </div>
          </section>

          <section className="offer-banner" id="offers">
            <div className="offer-copy">
              <span className="eyebrow light"><Flame size={15} /> EXCLUSIVE FOOD DEALS</span>
              <h2>Your cravings.<br /><span>Our best deals.</span></h2>
              <p>Delicious meals, tempting prices, and something tasty for every mood.</p>
              <button onClick={() => scrollTo("menu")}>Explore Offers <ArrowRight size={18} /></button>
            </div>
            <div className="offer-visual">
              <span className="offer-emoji">🍕</span>
              <div className="offer-circle"><small>DEALS UP TO</small><strong>50%</strong><span>OFF</span></div>
              <span className="offer-emoji second">🍔</span>
              <span className="offer-spark">✦</span>
            </div>
          </section>

          <section className="section food-section" id="menu">
            <div className="section-heading">
              <div>
                <span className="section-kicker">MADE FOR YOUR CRAVINGS</span>
                <h2>{search ? "Search Results" : activeCategory === "All" ? "Our Delicious Menu" : `${activeCategory} Menu`}</h2>
                <p className="section-description">Fresh picks, tasty bites, and favorites you will love.</p>
              </div>
              <span className="result-count">{filteredFoods.length} dishes</span>
            </div>

            <div className="filter-pills">
              {categories.map(({ name }) => (
                <button key={name} className={activeCategory === name ? "filter-pill active" : "filter-pill"} onClick={() => {
                  setActiveCategory(name);
                  setShowAll(false);
                }}>{name}</button>
              ))}
            </div>

            <div className="food-grid">
              {filteredFoods.slice(0, showAll ? undefined : 12).map((food) => (
                <article className="food-card" key={food.id}>
                  <div className="food-image-wrap">
                    <SafeImage src={food.image} alt={food.name} width={600} />
                    {food.popular && <span className="popular-tag"><Flame size={12} /> Popular</span>}
                    <span className={`veg-mark ${food.veg ? "veg" : "nonveg"}`} title={food.veg ? "Vegetarian" : "Non-vegetarian"}><span /></span>
                    <button className={`food-heart ${wishlist.includes(food.id) ? "liked" : ""}`} onClick={() => toggleWishlist(food.id)} aria-label="Add to wishlist">
                      <Heart size={19} fill={wishlist.includes(food.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <div className="food-info">
                    <div className="food-title-row"><h3>{food.name}</h3><span className="food-rating"><Star size={13} fill="currentColor" /> {food.rating}</span></div>
                    <p className="food-restaurant">{food.restaurant}</p>
                    <div className="food-bottom">
                      <div><strong>₹{food.price}</strong><del>₹{food.oldPrice}</del></div>
                      <button className="add-button" onClick={() => addToCart(food)}><Plus size={16} /> Add</button>
                    </div>
                    <button
                      type="button"
                      className="order-now-btn"
                      onClick={() => handleOrderNow(food)}
                    >
                      Order Now <ArrowRight size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {filteredFoods.length > 12 && (
              <button className="view-more" onClick={() => setShowAll(!showAll)}>
                {showAll ? "Show Less" : `View All ${filteredFoods.length} Dishes`} <ChevronRight size={17} />
              </button>
            )}
            {filteredFoods.length === 0 && <div className="empty-state">No dishes found. Try another search or category.</div>}
          </section>

          <section className="section wishlist-section">
            <div className="section-heading">
              <div><span className="section-kicker">SAVED WITH LOVE</span><h2>Your Wishlist <Heart size={22} className="inline-heart" /></h2></div>
              <span className="result-count">{wishlist.filter((id) => typeof id === "number").length} saved dishes</span>
            </div>
            {wishlist.some((id) => typeof id === "number") ? (
              <div className="food-grid">
                {foods.filter((food) => wishlist.includes(food.id)).map((food) => (
                  <article className="food-card" key={food.id}>
                    <div className="food-image-wrap"><SafeImage src={food.image} alt={food.name} width={600} /></div>
                    <div className="food-info">
                      <h3>{food.name}</h3>
                      <p className="food-restaurant">{food.restaurant}</p>
                      <div className="food-bottom">
                        <strong>₹{food.price}</strong>
                        <button className="add-button" onClick={() => addToCart(food)}><Plus size={16} /> Add</button>
                      </div>
                      <button
                        type="button"
                        className="order-now-btn"
                        onClick={() => handleOrderNow(food)}
                      >
                        Order Now <ArrowRight size={17} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <p className="wishlist-empty">Tap the ♡ on any dish to save your favorites here.</p>}
          </section>

          <section className="perks">
            <div><span><ShoppingCart /></span><div><b>Easy Ordering</b><p>Simple and quick process</p></div></div>
            <div><span><ShieldCheck /></span><div><b>Quality You Trust</b><p>Fresh food, made with care</p></div></div>
            <div><span><PackageCheck /></span><div><b>Fast Delivery</b><p>Meals to your doorstep</p></div></div>
            <div><span><Tag /></span><div><b>Exciting Offers</b><p>More flavor, more savings</p></div></div>
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-main">
          <div className="footer-brand">
            <a href="#home" className="brand" onClick={(e) => {
              e.preventDefault();
              scrollTo("home");
            }}>
              <span className="brand-icon"><Utensils size={25} /></span>
              <span>Ruthvik <b>Foods</b></span>
            </a>
            <p>Good food brings people together.<br />We bring it right to your door.</p>
            <div className="socials"><a href="#home" aria-label="Facebook">f</a><a href="#home" aria-label="Instagram">◎</a><a href="#home" aria-label="X">𝕏</a><a href="#home" aria-label="YouTube">▶</a></div>
          </div>
          <div><h4>Quick Links</h4><button onClick={() => scrollTo("home")}>Home</button><button onClick={() => scrollTo("restaurants")}>Restaurants</button><button onClick={() => scrollTo("menu")}>Food Menu</button><button onClick={() => scrollTo("offers")}>Offers</button></div>
          <div><h4>Customer Care</h4><button onClick={() => notify("Help Center coming soon.")}>Help Center</button><button onClick={() => notify("Contact support@ruthvikfoods.example")}>Contact Us</button><button onClick={() => notify("Terms page coming soon.")}>Terms & Conditions</button><button onClick={() => notify("Privacy page coming soon.")}>Privacy Policy</button></div>
          <div><h4>Get in Touch</h4><p><MapPin size={16} /> Vijayawada, India</p><p><Clock size={16} /> Daily: 9 AM – 11 PM</p><p>✉ support@ruthvikfoods.example</p><p className="footer-note">Sample contact details — update before publishing.</p></div>
        </div>
        <div className="footer-bottom"><span>© 2026 Ruthvik Foods. All rights reserved.</span><span>Made with <b>♥</b> for food lovers.</span></div>
      </footer>

      {notice && <div className="toast"><span>✓</span>{notice}</div>}

      {showCart && (
        <div className="modal-backdrop" onClick={() => setShowCart(false)}>
          <aside className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div><span className="section-kicker">YOUR ORDER</span><h2>Your Cart ({cartCount})</h2></div>
              <button className="close-button" onClick={() => setShowCart(false)} aria-label="Close cart"><X /></button>
            </div>
            {!cart.length ? (
              <div className="cart-empty">
                <span>🛒</span><h3>Your cart is hungry!</h3>
                <p>Add delicious dishes to get started.</p>
                <button className="primary-button" onClick={() => {
                  setShowCart(false);
                  scrollTo("menu");
                }}>Explore Menu</button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.id}>
                      <SafeImage src={item.image} alt={item.name} width={180} />
                      <div className="cart-item-details">
                        <h4>{item.name}</h4><p>₹{item.price}</p>
                        <div className="quantity-control">
                          <button onClick={() => updateQuantity(item.id, -1)} aria-label="Decrease quantity"><Minus size={14} /></button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} aria-label="Increase quantity"><Plus size={14} /></button>
                        </div>
                      </div>
                      <button className="remove-item" onClick={() => setCart((prev) => prev.filter((x) => x.id !== item.id))} aria-label="Remove item"><Trash2 size={17} /></button>
                    </div>
                  ))}
                </div>
                <div className="cart-delivery-address">
                  <label htmlFor="delivery-address">
                    <MapPin size={18} />
                    Delivery Address
                  </label>
                  <textarea
                    id="delivery-address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter house number, street, area and city"
                    rows={3}
                  />
                  <small>Enter the full address where you want your food delivered.</small>
                </div>
                <div className="cart-summary">
                  <div><span>Item total</span><span>₹{subtotal}</span></div>
                  <div><span>Delivery fee</span><span>{deliveryFee ? `₹${deliveryFee}` : "FREE"}</span></div>
                  {subtotal > 0 && subtotal < 499 && <p className="free-delivery-note">Add ₹{499 - subtotal} more for free delivery!</p>}
                  <div className="grand-total"><b>To Pay</b><b>₹{total}</b></div>
                  <button className="primary-button full-button" onClick={handleCheckout}>Proceed to Checkout <ArrowRight size={17} /></button>
                  <p className="demo-note">Demo checkout — payment integration is not connected.</p>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

    </div>
  );
}

function OrdersPage() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [orders, setOrders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const myOrders = orders.filter(
    (order) =>
      order.customerEmail?.toLowerCase() === user?.email?.toLowerCase()
  );

  const totalValue = myOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const activeOrders = myOrders.filter(
    (order) => !["Delivered", "Cancelled"].includes(order.status)
  ).length;

  const refreshOrders = () => {
    try {
      setOrders(JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]"));
    } catch {
      setOrders([]);
    }
  };

  const scrollFoodCarousel = (direction) => {
    const carousel = document.getElementById("orders-food-carousel");

    if (carousel) {
      carousel.scrollBy({
        left: direction * 300,
        behavior: "smooth",
      });
    }
  };

  const popularFoods = foods.slice(0, 10);

  return (
    <div className="orders-page">
      {/* NAVIGATION */}
      <header className="orders-topbar">
        <button
          className="orders-back"
          onClick={() => navigate("/")}
        >
          ← Back to Home
        </button>

        <div className="orders-brand">
          <span>🍽️</span>
          <strong>
            Ruthvik <b>Foods</b>
          </strong>
        </div>

        <button className="orders-refresh" onClick={refreshOrders}>
          ↻ Refresh
        </button>
      </header>

      {/* HERO BANNER */}
      <section className="orders-hero">
        <div className="orders-hero-copy">
          <span className="orders-eyebrow">
            YOUR FOOD JOURNEY
          </span>

          <h1>
            My <span>Orders</span>
          </h1>

          <p>
            Hi {user?.name || "there"}! Track your delicious moments
            and discover your next favourite meal.
          </p>

          <button
            className="orders-primary hero-order-button"
            onClick={() => navigate("/")}
          >
            Explore Delicious Food <span>→</span>
          </button>
        </div>

        <div className="orders-hero-image">
          <SafeImage
            src={
              popularFoods[0]?.image ||
              "photo-1546069901-ba9599a7e63c"
            }
            alt="Delicious food"
            width={700}
          />
          <div className="orders-image-badge">
            <span>🍴</span>
            <div>
              <strong>Made with love</strong>
              <small>Fresh food, happy mood!</small>
            </div>
          </div>
        </div>

        <div className="orders-stats">
          <div className="orders-stat-card">
            <span className="orders-stat-icon">🛍️</span>
            <div>
              <strong>{myOrders.length}</strong>
              <span>Total Orders</span>
            </div>
          </div>

          <div className="orders-stat-card">
            <span className="orders-stat-icon">🚚</span>
            <div>
              <strong>{activeOrders}</strong>
              <span>Active Orders</span>
            </div>
          </div>

          <div className="orders-stat-card">
            <span className="orders-stat-icon">💰</span>
            <div>
              <strong>₹{totalValue.toLocaleString("en-IN")}</strong>
              <span>Total Order Value</span>
            </div>
          </div>
        </div>
      </section>

      <main className="orders-content">
        {/* FOOD CAROUSEL */}
        <section className="orders-carousel-section">
          <div className="orders-carousel-heading">
            <div>
              <span className="orders-eyebrow">
                SOMETHING TASTY
              </span>
              <h2>Craving Something Delicious?</h2>
              <p>Discover more delicious picks from our menu.</p>
            </div>

            <div className="orders-carousel-controls">
              <button
                type="button"
                onClick={() => scrollFoodCarousel(-1)}
                aria-label="Previous food items"
              >
                ←
              </button>

              <button
                type="button"
                onClick={() => scrollFoodCarousel(1)}
                aria-label="Next food items"
              >
                →
              </button>
            </div>
          </div>

          <div
            className="orders-carousel-track"
            id="orders-food-carousel"
          >
            {popularFoods.map((food) => (
              <article
                className="orders-carousel-card"
                key={food.id}
              >
                <div className="orders-carousel-image">
                  <SafeImage
                    src={food.image}
                    alt={food.name}
                    width={450}
                  />

                  {food.popular && (
                    <span className="orders-food-badge">
                      ★ Popular
                    </span>
                  )}
                </div>

                <div className="orders-carousel-card-content">
                  <h3>{food.name}</h3>
                  <p>{food.restaurant}</p>

                  <div className="orders-carousel-bottom">
                    <strong>₹{food.price}</strong>

                    <button
                      type="button"
                      onClick={() => navigate("/")}
                    >
                      Order Now →
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ORDER HISTORY */}
        <section className="orders-history-section">
          <div className="orders-heading-row">
            <div>
              <span className="orders-eyebrow">
                YOUR RECENT ACTIVITY
              </span>
              <h2>Order History</h2>
              <p>Your orders, items and delivery details in one place.</p>
            </div>

            <button
              className="orders-primary"
              onClick={() => navigate("/")}
            >
              + Order More Food
            </button>
          </div>

          {myOrders.length === 0 ? (
            <div className="orders-empty">
              <div className="orders-empty-image">
                {popularFoods[0] ? (
                  <SafeImage
                    src={popularFoods[0].image}
                    alt="Delicious meal"
                    width={350}
                  />
                ) : (
                  <span>🍲</span>
                )}
              </div>

              <span className="orders-eyebrow">
                YOUR NEXT MEAL IS WAITING
              </span>

              <h3>No orders yet!</h3>

              <p>
                Your order history will appear here after you place
                your first order. Let's find something delicious.
              </p>

              <button
                className="orders-primary"
                onClick={() => navigate("/")}
              >
                Explore Menu →
              </button>
            </div>
          ) : (
            <div className="orders-list">
              {myOrders.map((order, index) => (
                <article
                  className="order-card"
                  key={order.id}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="order-card-head">
                    <div className="order-card-title">
                      <span className="order-id">
                        ORDER #{order.id}
                      </span>

                      <h3>
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "Order date unavailable"}
                      </h3>
                    </div>

                    <span
                      className={`order-status status-${String(
                        order.status || "Placed"
                      )
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {order.status || "Placed"}
                    </span>
                  </div>

                  <div className="order-items-list">
                    {(order.items || []).map((item, itemIndex) => (
                      <div
                        className="order-line-item"
                        key={`${order.id}-${item.id ?? itemIndex}`}
                      >
                        <div className="order-item-image-wrap">
                          {item.image ? (
                            <SafeImage
                              src={item.image}
                              alt={item.name || "Food item"}
                              width={180}
                            />
                          ) : (
                            <div className="order-item-fallback">
                              🍽️
                            </div>
                          )}
                        </div>

                        <div className="order-item-details">
                          <b>{item.name || "Food item"}</b>

                          <small>
                            {item.restaurant || "Ruthvik Foods"}
                          </small>

                          <span className="order-item-quantity">
                            Quantity: {item.quantity || 1}
                          </span>
                        </div>

                        <strong className="order-item-price">
                          ₹
                          {Number(item.price || 0) *
                            Number(item.quantity || 1)}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div className="order-card-foot">
                    <div className="order-delivery-detail">
                      <small>DELIVERY ADDRESS</small>
                      <b>
                        <MapPin size={15} />
                        <span>{order.address || "Address not available"}</span>
                      </b>
                    </div>

                    <div className="order-payment-detail">
                      <small>PAYMENT METHOD</small>
                      <b>
                        {order.paymentMethod || "Payment details unavailable"}
                      </b>
                    </div>

                    <div className="order-total">
                      <small>ORDER TOTAL</small>
                      <strong>
                        ₹{Number(order.total || 0).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>

                  <div className="order-card-bottom">
                    <span>♥ Thank you for ordering with Ruthvik Foods!</span>

                    <button
                      type="button"
                      onClick={() => navigate("/")}
                    >
                      Order Again →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* SERVICE BENEFITS */}
        <section className="orders-benefits">
          <div>
            <span>🚀</span>
            <div>
              <b>Quick Ordering</b>
              <p>Your favourite food, made easy.</p>
            </div>
          </div>

          <div>
            <span>🥗</span>
            <div>
              <b>Fresh & Delicious</b>
              <p>Great meals for every craving.</p>
            </div>
          </div>

          <div>
            <span>❤️</span>
            <div>
              <b>Made for You</b>
              <p>Thanks for choosing Ruthvik Foods.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="orders-footer">
        <div className="orders-brand">
          <span>🍽️</span>
          <strong>
            Ruthvik <b>Foods</b>
          </strong>
        </div>

        <p>Good food brings people together. Made with ♥ for food lovers.</p>
      </footer>
    </div>
  );
}
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;