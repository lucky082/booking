const BASE = "https://hotelbooking.stepprojects.ge";
let authToken = localStorage.getItem("stayra_token") || "";
let currentUser = JSON.parse(localStorage.getItem("stayra_user") || "null");
let selectedRoom = null;
let currentHotel = null;

// ── Date defaults
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter = new Date(today);
dayAfter.setDate(dayAfter.getDate() + 2);
const fmt = (d) => d.toISOString().split("T")[0];

// ── API
async function api(path, method = "GET", body = null) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (authToken) headers["Authorization"] = "Bearer " + authToken;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (res.status === 404) {
    // Only redirect for page-level GET requests, not background data fetches
    const isPageResource = method === "GET" && path.includes("/GetHotel/");
    if (isPageResource) {
      window.location.href = "404.html";
      return { ok: false, status: 404, data: null };
    }
  }
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

// ══════════════════════════════════════
// AUTH — local localStorage
// ══════════════════════════════════════

function getUsers() {
  return JSON.parse(localStorage.getItem("stayra_users") || "{}");
}
function saveUsers(users) {
  localStorage.setItem("stayra_users", JSON.stringify(users));
}

function renderNavAuth() {
  const group = document.getElementById("navAuthGroup");
  if (currentUser) {
    const initials = (
      (currentUser.firstName || "U")[0] + (currentUser.lastName || "")[0]
    ).toUpperCase();
    const displayName = currentUser.firstName || currentUser.email;
    group.innerHTML = `
      <div class="nav-user-pill">
        <div class="nav-user-avatar">${initials || "★"}</div>
        <span class="nav-user-name">${displayName}</span>
      </div>
      <button class="nav-btn-ghost" onclick="handleLogout()">Sign Out</button>
    `;
  } else {
    group.innerHTML = `
      <button class="nav-btn-outline" onclick="openAuthModal('login')">Sign In</button>
      <button class="nav-btn-solid" onclick="openAuthModal('register')">Join Free</button>
    `;
  }
}

function openAuthModal(tab = "login") {
  switchAuthTab(tab);
  clearAuthForms();
  document.getElementById("authModal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeAuthModal() {
  document.getElementById("authModal").classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("authModal").addEventListener("click", function (e) {
  if (e.target === this) closeAuthModal();
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") closeAuthModal();
});

function switchAuthTab(tab) {
  document
    .getElementById("tabLogin")
    .classList.toggle("active", tab === "login");
  document
    .getElementById("tabRegister")
    .classList.toggle("active", tab === "register");
  document
    .getElementById("formLogin")
    .classList.toggle("active", tab === "login");
  document
    .getElementById("formRegister")
    .classList.toggle("active", tab === "register");
  clearAuthForms();
}

function clearAuthForms() {
  ["loginError", "loginSuccess", "registerError", "registerSuccess"].forEach(
    (id) => {
      const el = document.getElementById(id);
      el.classList.remove("visible");
      el.textContent = "";
    },
  );
  document
    .querySelectorAll(".form-error")
    .forEach((e) => e.classList.remove("visible"));
  document
    .querySelectorAll(".form-input")
    .forEach((i) => i.classList.remove("error"));
}

function setAuthError(formId, msg) {
  const el = document.getElementById(formId + "Error");
  el.innerHTML = "✕ &nbsp;" + msg;
  el.classList.add("visible");
}
function setAuthSuccess(formId, msg) {
  const el = document.getElementById(formId + "Success");
  el.innerHTML = "✓ &nbsp;" + msg;
  el.classList.add("visible");
}

function togglePwd(inputId, icon) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  icon.textContent = isHidden ? "🙈" : "👁";
}

function checkPasswordStrength(val) {
  const bar = document.getElementById("strengthFill");
  const label = document.getElementById("strengthLabel");
  const wrap = document.getElementById("passwordStrength");
  if (!val) {
    wrap.classList.remove("visible");
    return;
  }
  wrap.classList.add("visible");
  let score = 0;
  if (val.length >= 8) score++;
  if (val.length >= 12) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const levels = [
    { pct: "20%", color: "#e05555", text: "Very weak" },
    { pct: "40%", color: "#e08855", text: "Weak" },
    { pct: "60%", color: "#c8a96e", text: "Fair" },
    { pct: "80%", color: "#8bc47a", text: "Strong" },
    { pct: "100%", color: "#4caf7a", text: "Very strong" },
  ];
  const lvl = levels[Math.min(score - 1, 4)] || levels[0];
  bar.style.width = lvl.pct;
  bar.style.background = lvl.color;
  label.textContent = lvl.text;
  label.style.color = lvl.color;
}

// ── LOGIN
function handleLogin() {
  clearAuthForms();
  const email = document
    .getElementById("loginEmail")
    .value.trim()
    .toLowerCase();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    setAuthError("login", "Please fill in all fields.");
    return;
  }

  const users = getUsers();
  const user = users[email];

  if (!user || user.password !== password) {
    setAuthError("login", "Incorrect email or password.");
    return;
  }

  currentUser = { firstName: user.firstName, lastName: user.lastName, email };
  localStorage.setItem("stayra_user", JSON.stringify(currentUser));
  renderNavAuth();
  setAuthSuccess("login", "Welcome back!");
  setTimeout(() => closeAuthModal(), 900);
  toast("Welcome back, " + user.firstName + "! 🌟", "success");
}

// ── REGISTER
function handleRegister() {
  clearAuthForms();

  const firstName = document.getElementById("regFirstName").value.trim();
  const lastName = document.getElementById("regLastName").value.trim();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const password = document.getElementById("regPassword").value;
  const confirm = document.getElementById("regPasswordConfirm").value;

  let valid = true;
  if (!firstName) {
    document.getElementById("regFirstName").classList.add("error");
    document.getElementById("errFirstName").classList.add("visible");
    valid = false;
  }
  if (!lastName) {
    document.getElementById("regLastName").classList.add("error");
    document.getElementById("errLastName").classList.add("visible");
    valid = false;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById("regEmail").classList.add("error");
    document.getElementById("errEmail").classList.add("visible");
    valid = false;
  }
  if (!password || password.length < 8) {
    document.getElementById("regPassword").classList.add("error");
    document.getElementById("errPassword").classList.add("visible");
    valid = false;
  }
  if (password !== confirm) {
    document.getElementById("regPasswordConfirm").classList.add("error");
    document.getElementById("errPasswordConfirm").classList.add("visible");
    valid = false;
  }
  if (!valid) return;

  const users = getUsers();
  if (users[email]) {
    setAuthError("register", "An account with this email already exists.");
    return;
  }

  users[email] = { firstName, lastName, password };
  saveUsers(users);

  currentUser = { firstName, lastName, email };
  localStorage.setItem("stayra_user", JSON.stringify(currentUser));
  renderNavAuth();
  setAuthSuccess("register", "Account created! Welcome to STAYRA.");
  setTimeout(() => closeAuthModal(), 1000);
  toast("Welcome to STAYRA, " + firstName + "! 🎉", "success");
}

// ── LOGOUT
function handleLogout() {
  authToken = "";
  currentUser = null;
  localStorage.removeItem("stayra_token");
  localStorage.removeItem("stayra_user");
  renderNavAuth();
  toast("Signed out. See you soon! ✨", "success");
}

// ══════════════════════════════════════
// PAGES
// ══════════════════════════════════════

function showPage(name) {
  if (name === "home") {
    window.location.href = "index.html";
    return;
  }
  if (name === "bookings") {
    if (!currentUser) {
      openAuthModal("login");
      return;
    }
    window.location.href = "bookings.html";
    return;
  }
  // fallback for any in-page navigation
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  const target = document.getElementById("page-" + name);
  if (target) target.classList.add("active");
  window.scrollTo(0, 0);
}

// ══════════════════════════════════════
// HOTELS
// ══════════════════════════════════════

const HOTEL_EMOJIS = [
  "🏨",
  "🏩",
  "🏛",
  "🌴",
  "⛩",
  "🏰",
  "🌊",
  "🗼",
  "🌺",
  "🏔",
];

async function loadCities() {
  const { ok, data } = await api("/api/Hotels/GetCities");
  if (!ok || !data) return;
  const cities = Array.isArray(data) ? data : data.cities || data.data || [];
  const dl = document.getElementById("citiesList");
  if (dl)
    dl.innerHTML = cities.map((c) => `<option value="${c}"></option>`).join("");
}

async function loadHotels(city = "") {
  const grid = document.getElementById("hotelsGrid");
  if (!grid) return;
  grid.innerHTML = Array(6)
    .fill(0)
    .map(
      () => `
    <div class="hotel-card">
      <div class="hotel-card-img"><div class="skeleton" style="width:100%;height:100%"></div></div>
      <div class="hotel-card-body">
        <div class="skeleton" style="height:22px;width:65%;margin-bottom:8px"></div>
        <div class="skeleton" style="height:14px;width:45%;margin-bottom:20px"></div>
        <div class="skeleton" style="height:16px;width:30%"></div>
      </div>
    </div>`,
    )
    .join("");

  const endpoint = city
    ? `/api/Hotels/GetHotels?city=${encodeURIComponent(city)}`
    : "/api/Hotels/GetAll";
  const { ok, data } = await api(endpoint);

  if (!ok || !data) {
    grid.innerHTML =
      '<div style="color:var(--text3);font-size:0.85rem;grid-column:1/-1;padding:2rem 0">Could not load hotels. Check your connection.</div>';
    return;
  }

  const hotels = Array.isArray(data)
    ? data
    : data.items || data.data || data.hotels || [];

  if (!hotels.length) {
    grid.innerHTML =
      '<div style="color:var(--text3);font-size:0.85rem;grid-column:1/-1;padding:2rem 0">No hotels found.</div>';
    return;
  }

  grid.innerHTML = hotels
    .map((h, i) => {
      const stars = h.starRating || h.stars || h.category || 4;
      const price =
        h.pricePerNight || h.price || h.minPrice || h.roomPrice || "—";
      const rating =
        h.rating || h.averageRating || (Math.random() * 1 + 4).toFixed(1);
      const loc = h.city || h.location || h.address || "Premier Location";
      const imgUrl = h.featuredImage || h.imageUrl || h.image || h.photo || "";
      const emoji = HOTEL_EMOJIS[i % HOTEL_EMOJIS.length];
      return `
    <div class="hotel-card" onclick="showHotelDetail(${JSON.stringify(h).replace(/"/g, "&quot;")})">
      <div class="hotel-card-img">
        ${
          imgUrl
            ? `<img src="${imgUrl}" alt="${h.name}" onerror="this.parentNode.innerHTML='<div class=hotel-card-img-placeholder>${emoji}</div>">`
            : `<div class="hotel-card-img-placeholder">${emoji}</div>`
        }
        <div class="hotel-stars">${"★".repeat(Math.min(stars, 5))}</div>
      </div>
      <div class="hotel-card-body">
        <div class="hotel-card-name">${h.name || "Hotel"}</div>
        <div class="hotel-card-location">${loc}</div>
        <div class="hotel-card-footer">
          <div class="hotel-card-price">${price !== "—" ? "$" + price : "From request"}<span>/night</span></div>
          <div class="hotel-card-rating"><span class="rating-star">★</span>${parseFloat(rating).toFixed(1)}</div>
        </div>
      </div>
    </div>`;
    })
    .join("");
}

function searchHotels() {
  const city = document.getElementById("searchCity").value.trim();
  const ci = document.getElementById("searchCheckIn").value;
  const co = document.getElementById("searchCheckOut").value;
  if (ci) document.getElementById("bookCheckIn").value = ci;
  if (co) document.getElementById("bookCheckOut").value = co;
  loadHotels(city);
  window.scrollTo({
    top: document.querySelector(".section").offsetTop - 80,
    behavior: "smooth",
  });
}

// ══════════════════════════════════════
// HOTEL DETAIL
// ══════════════════════════════════════

function showHotelDetail(hotelBasic) {
  sessionStorage.setItem("stayra_hotel", JSON.stringify(hotelBasic));
  window.location.href = "hoteldetails.html";
}

function renderHotelDetail(hotel) {
  document.getElementById("detailName").textContent = hotel.name || "Hotel";
  document.getElementById("detailLocation").textContent =
    "📍 " + (hotel.city || hotel.location || hotel.address || "");
  const stars = hotel.starRating || hotel.stars || hotel.category || 4;
  document.getElementById("detailStars").textContent = "★".repeat(
    Math.min(stars, 5),
  );
  document.getElementById("detailRating").textContent = hotel.rating
    ? `⭐ ${hotel.rating}`
    : "";
  document.getElementById("detailDesc").textContent =
    hotel.description ||
    "A premium hotel offering exceptional comfort and world-class amenities for discerning travelers.";

  const imgUrl =
    hotel.featuredImage || hotel.imageUrl || hotel.image || hotel.photo || "";
  const heroEl = document.getElementById("detailHero");
  const ph = document.getElementById("detailHeroPlaceholder");
  heroEl.querySelectorAll("img.detail-hero-img").forEach((i) => i.remove());
  if (imgUrl) {
    const img = document.createElement("img");
    img.className = "detail-hero-img";
    img.src = imgUrl;
    img.alt = hotel.name;
    img.onerror = () => img.remove();
    heroEl.insertBefore(img, heroEl.firstChild);
    ph.style.display = "none";
  } else {
    ph.style.display = "flex";
  }
}

// ══════════════════════════════════════
// ROOMS
// ══════════════════════════════════════

const ROOM_EMOJIS = ["🛏", "🛋", "🏠", "🌅", "🌃", "🏙", "🌴", "🌊"];
let roomTypes = {};
let allRooms = [];
let baseRooms = []; // original full list, never overwritten by filters
let activeRoomFilter = "all";

async function loadRoomTypes() {
  const { ok, data } = await api("/api/Rooms/GetRoomTypes");
  if (ok && Array.isArray(data)) {
    data.forEach((t) => {
      roomTypes[t.id] = t.name;
    });
    const sel = document.getElementById("filterRoomType");
    if (sel) {
      data.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.name;
        sel.appendChild(opt);
      });
    }
  }
}

async function applyRoomFilters() {
  if (!currentHotel) return;
  const list = document.getElementById("roomsList");
  list.innerHTML =
    '<div style="color:var(--text3);font-size:0.85rem;padding:1rem 0" class="loading-dots">Filtering rooms</div>';

  const roomTypeId =
    parseInt(document.getElementById("filterRoomType").value) || 0;
  const priceFrom =
    parseFloat(document.getElementById("filterPriceFrom").value) || 0;
  const priceToVal = document.getElementById("filterPriceTo").value.trim();
  const priceTo = priceToVal ? parseFloat(priceToVal) || 0 : 0;
  const maxGuestsVal = document.getElementById("filterMaxGuests").value.trim();
  const maximumGuests = maxGuestsVal ? parseInt(maxGuestsVal) || 0 : 0;
  const checkIn = document.getElementById("bookCheckIn").value;
  const checkOut = document.getElementById("bookCheckOut").value;

  // Start from the full hotel room list
  let rooms = [...baseRooms];

  // Get available IDs from API (date-based availability)
  const payload = {
    roomTypeId: 0,
    priceFrom: 0,
    priceTo: 0,
    maximumGuests: 0,
    checkIn: checkIn
      ? new Date(checkIn).toISOString()
      : new Date().toISOString(),
    checkOut: checkOut
      ? new Date(checkOut).toISOString()
      : new Date().toISOString(),
  };
  const { ok, data } = await api("/api/Rooms/GetFiltered", "POST", payload);
  if (ok && data) {
    const apiRooms = Array.isArray(data)
      ? data
      : data.items || data.rooms || data.data || [];
    if (apiRooms.length > 0) {
      const apiIds = new Set(apiRooms.map((r) => String(r.id)));
      rooms = rooms.filter((r) => apiIds.has(String(r.id)));
    }
  }

  // Always apply client-side criteria
  rooms = rooms.filter((r) => {
    const price = r.pricePerNight || r.price || r.rate || 0;
    const cap = r.maximumGuests || r.maxGuests || r.capacity || 1;
    if (roomTypeId && parseInt(r.roomTypeId) !== roomTypeId) return false;
    if (priceFrom && price < priceFrom) return false;
    if (priceTo && price > priceTo) return false;
    if (maximumGuests && cap < maximumGuests) return false;
    return true;
  });

  if (!rooms.length) {
    list.innerHTML =
      '<div style="color:var(--text3);padding:2rem 0;font-size:0.85rem">No rooms match your filters.</div>';
    return;
  }
  renderFilteredRooms(rooms);
}

function clearRoomFilters() {
  document.getElementById("filterRoomType").value = "0";
  document.getElementById("filterPriceFrom").value = "";
  document.getElementById("filterPriceTo").value = "";
  document.getElementById("filterMaxGuests").value = "";
  if (currentHotel) loadRooms(currentHotel.id || currentHotel.hotelId);
}

async function loadRooms(hotelId) {
  const list = document.getElementById("roomsList");
  list.innerHTML =
    '<div style="color:var(--text3);font-size:0.85rem;padding:1rem 0" class="loading-dots">Loading rooms</div>';

  const hotelRes = await api(`/api/Hotels/GetHotel/${hotelId}`);
  if (hotelRes.ok && hotelRes.data) {
    const rooms = hotelRes.data.rooms || [];
    if (rooms.length > 0) {
      renderRooms(rooms);
      return;
    }
  }

  const filtered = await api("/api/Rooms/GetFiltered", "POST", { hotelId });
  if (filtered.ok && filtered.data) {
    const rooms = Array.isArray(filtered.data)
      ? filtered.data
      : filtered.data.items || filtered.data.rooms || filtered.data.data || [];
    if (rooms.length > 0) {
      renderRooms(rooms);
      return;
    }
  }

  const all = await api("/api/Rooms/GetAll");
  if (all.ok && all.data) {
    const rooms = Array.isArray(all.data)
      ? all.data
      : all.data.items || all.data.rooms || all.data.data || [];
    const forHotel = rooms.filter((r) => String(r.hotelId) === String(hotelId));
    if (forHotel.length > 0) {
      renderRooms(forHotel);
      return;
    }
    if (rooms.length > 0) {
      renderRooms(rooms);
      return;
    }
  }

  list.innerHTML =
    '<div style="color:var(--text3);padding:2rem 0;font-size:0.85rem">No rooms available for this hotel.</div>';
}

function renderRooms(data) {
  const rooms = Array.isArray(data)
    ? data
    : data.items || data.rooms || data.data || [];
  if (!rooms.length) {
    document.getElementById("roomsList").innerHTML =
      '<div style="color:var(--text3);padding:2rem 0;font-size:0.85rem">No rooms available.</div>';
    document.getElementById("roomFilters").innerHTML = "";
    return;
  }
  allRooms = rooms;
  baseRooms = rooms; // preserve original for subsequent filter runs
  activeRoomFilter = "all";
  buildRoomFilters(rooms);
  renderFilteredRooms(rooms);
}

function buildRoomFilters(rooms) {
  const filtersEl = document.getElementById("roomFilters");
  const categoryMap = {};
  rooms.forEach((r) => {
    const label = roomTypes[r.roomTypeId] || r.roomType || null;
    if (label) categoryMap[label] = label;
  });
  const categories = Object.values(categoryMap);
  if (categories.length < 2) {
    filtersEl.innerHTML = "";
    return;
  }
  const allCount = rooms.length;
  let html = `<button class="room-filter-btn active" onclick="filterRooms('all', this)">All <span style="opacity:0.5;font-size:0.7em">(${allCount})</span></button>`;
  categories.forEach((cat) => {
    const count = rooms.filter(
      (r) => (roomTypes[r.roomTypeId] || r.roomType) === cat,
    ).length;
    html += `<button class="room-filter-btn" onclick="filterRooms(${JSON.stringify(cat)}, this)">${cat} <span style="opacity:0.5;font-size:0.7em">(${count})</span></button>`;
  });
  filtersEl.innerHTML = html;
}

function filterRooms(category, el) {
  activeRoomFilter = category;
  document
    .querySelectorAll(".room-filter-btn")
    .forEach((btn) => btn.classList.remove("active"));
  if (el) el.classList.add("active");
  const filtered =
    category === "all"
      ? allRooms
      : allRooms.filter(
          (r) => (roomTypes[r.roomTypeId] || r.roomType) === category,
        );
  renderFilteredRooms(filtered);
}

function renderFilteredRooms(rooms) {
  const list = document.getElementById("roomsList");
  if (!rooms.length) {
    list.innerHTML =
      '<div style="color:var(--text3);padding:2rem 0;font-size:0.85rem">No rooms in this category.</div>';
    return;
  }
  list.innerHTML = rooms
    .map((r, i) => {
      const price = r.pricePerNight || r.price || r.rate || 0;
      const cap =
        r.maximumGuests || r.maxGuests || r.capacity || r.guestCapacity || 2;
      const imgUrl =
        r.images && r.images.length
          ? r.images[0].source
          : r.featuredImage || r.imageUrl || r.image || "";
      const emoji = ROOM_EMOJIS[i % ROOM_EMOJIS.length];
      const available = r.available !== false;
      return `
    <div class="room-card" id="room-${r.id || i}">
      <div class="room-card-img">
        ${
          imgUrl
            ? `<img src="${imgUrl}" alt="${r.name}" onerror="this.parentNode.innerHTML='<div class=room-card-img-placeholder>${emoji}</div>">`
            : `<div class="room-card-img-placeholder">${emoji}</div>`
        }
      </div>
      <div class="room-card-body">
        <div class="room-type">${roomTypes[r.roomTypeId] || r.roomType || "Standard Room"}</div>
        <div class="room-name">${r.name || r.roomName || "Deluxe Room"}</div>
        <div class="room-capacity">👤 Up to ${cap} guest${cap > 1 ? "s" : ""}</div>
        ${!available ? `<div style="font-size:0.72rem;color:var(--red);margin-top:0.3rem">● Unavailable</div>` : `<div style="font-size:0.72rem;color:var(--green);margin-top:0.3rem">● Available</div>`}
      </div>
      <div class="room-card-action">
        <div class="room-price">$${price}<span>/night</span></div>
        <button class="book-room-btn" ${!available ? "disabled" : ""} onclick="selectRoom(${JSON.stringify(r).replace(/"/g, "&quot;")})">
          ${available ? "Select Room" : "Unavailable"}
        </button>
      </div>
    </div>`;
    })
    .join("");
}

function selectRoom(room) {
  if (!currentUser) {
    openAuthModal("login");
    toast("Please sign in to book a room.", "error");
    return;
  }
  selectedRoom = room;
  const price = room.pricePerNight || room.price || room.rate || 0;
  document.getElementById("selectedRoomName").textContent =
    room.name || room.roomName || "Selected Room";
  document.getElementById("selectedRoomPrice").textContent =
    `$${price} / night`;
  document.getElementById("selectedRoomDisplay").classList.add("visible");
  document.getElementById("confirmBookBtn").disabled = false;
  document.getElementById("confirmBookBtn").textContent = "Confirm Reservation";
  updatePriceSummary(price);
  document
    .querySelector(".booking-sidebar")
    .scrollIntoView({ behavior: "smooth", block: "nearest" });
  toast("Room selected! Choose your dates and confirm.", "success");
}

function updatePriceSummary(pricePerNight) {
  const ci = new Date(document.getElementById("bookCheckIn").value);
  const co = new Date(document.getElementById("bookCheckOut").value);
  const nights = Math.max(1, Math.round((co - ci) / 86400000));
  const subtotal = pricePerNight * nights;
  const tax = Math.round(subtotal * 0.12);
  document.getElementById("priceSummary").innerHTML = `
    <div class="sidebar-price-row"><span>$${pricePerNight} × ${nights} night${nights > 1 ? "s" : ""}</span><span>$${subtotal}</span></div>
    <div class="sidebar-price-row"><span>Taxes & fees</span><span>$${tax}</span></div>
    <div class="sidebar-total-row"><span>Total</span><span>$${subtotal + tax}</span></div>`;
}

document.getElementById("bookCheckIn").addEventListener("change", () => {
  if (selectedRoom)
    updatePriceSummary(selectedRoom.pricePerNight || selectedRoom.price || 0);
});
document.getElementById("bookCheckOut").addEventListener("change", () => {
  if (selectedRoom)
    updatePriceSummary(selectedRoom.pricePerNight || selectedRoom.price || 0);
});

async function confirmBooking() {
  if (!selectedRoom) return;
  if (!currentUser) {
    openAuthModal("login");
    return;
  }

  const btn = document.getElementById("confirmBookBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-inline"></span> Booking…';

  const checkIn = document.getElementById("bookCheckIn").value;
  const checkOut = document.getElementById("bookCheckOut").value;

  const payload = {
    roomId: selectedRoom.id || selectedRoom.roomId,
    hotelId: currentHotel?.id,
    checkIn,
    checkOut,
    checkInDate: checkIn,
    checkOutDate: checkOut,
  };

  const { ok, data } = await api("/api/Booking", "POST", payload);
  if (ok) {
    toast("🎉 Booking confirmed! Enjoy your stay.", "success");
    btn.textContent = "✓ Booked!";
    selectedRoom = null;
    document.getElementById("selectedRoomDisplay").classList.remove("visible");
  } else {
    const msg =
      data?.message || data?.title || "Booking failed. Please try again.";
    toast(msg, "error");
    btn.disabled = false;
    btn.textContent = "Confirm Reservation";
  }
}

// ══════════════════════════════════════
// BOOKINGS
// ══════════════════════════════════════

async function loadBookings() {
  const list = document.getElementById("bookingsList");
  list.innerHTML =
    '<div style="color:var(--text3);font-size:0.85rem;padding:2rem 0" class="loading-dots">Loading your bookings</div>';

  const { ok, data } = await api("/api/Booking");
  if (!ok || !data) {
    list.innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Could not load bookings</div><div class="empty-state-sub">Please sign in to view your reservations</div></div>';
    return;
  }

  const bookings = Array.isArray(data)
    ? data
    : data.items || data.bookings || data.data || [];
  if (!bookings.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🛌</div>
        <div class="empty-state-text">No bookings yet</div>
        <div class="empty-state-sub">Your future reservations will appear here</div>
        <br>
        <button class="nav-btn-solid" style="margin-top:1rem" onclick="showPage('home')">Browse Hotels</button>
      </div>`;
    return;
  }

  list.innerHTML = bookings
    .map((b) => {
      const status = (b.status || b.bookingStatus || "confirmed").toLowerCase();
      const statusClass = status.includes("cancel")
        ? "status-cancelled"
        : status.includes("pend")
          ? "status-pending"
          : "status-confirmed";
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
      const nights =
        b.nights ||
        Math.max(
          1,
          Math.round(
            (new Date(b.checkOut || b.checkOutDate) -
              new Date(b.checkIn || b.checkInDate)) /
              86400000,
          ),
        ) ||
        1;
      const price = b.totalPrice || b.total || b.amount || "—";
      const bookingId =
        b.id || b.bookingId || b.reservationId || b.Id || b.BookingId || "";
      return `
    <div class="booking-item" id="booking-${bookingId}">
      <div>
        <div class="booking-hotel-name">${b.hotelName || b.hotel?.name || b.roomName || "Hotel Reservation"}</div>
        <div class="booking-meta">
          <div class="booking-meta-item">📅 ${b.checkIn || b.checkInDate || "—"} → ${b.checkOut || b.checkOutDate || "—"}</div>
          <div class="booking-meta-item">🌙 ${nights} night${nights > 1 ? "s" : ""}</div>
          ${b.roomType || b.roomName ? `<div class="booking-meta-item">🛏 ${b.roomType || b.roomName}</div>` : ""}
        </div>
        <span class="booking-status ${statusClass}">● ${statusLabel}</span>
      </div>
      <div class="booking-right">
        <div class="booking-price">${price !== "—" ? "$" + price : "—"}</div>
        ${!status.includes("cancel") && bookingId ? `<button class="cancel-btn" onclick="cancelBooking('${bookingId}')">Cancel</button>` : ""}
      </div>
    </div>`;
    })
    .join("");
}

async function cancelBooking(id) {
  if (!id) {
    toast("Could not find booking ID.", "error");
    return;
  }
  if (!confirm("Cancel this booking?")) return;

  let result = await api(`/api/Booking/${id}`, "DELETE");
  if (result.ok) {
    toast("Booking cancelled.", "success");
    loadBookings();
    return;
  }
  result = await api(`/api/Booking/${id}`, "DELETE", { bookingId: id, id });
  if (result.ok) {
    toast("Booking cancelled.", "success");
    loadBookings();
    return;
  }
  result = await api(`/api/Booking?bookingId=${id}`, "DELETE");
  if (result.ok) {
    toast("Booking cancelled.", "success");
    loadBookings();
    return;
  }
  result = await api(`/api/Booking?id=${id}`, "DELETE");
  if (result.ok) {
    toast("Booking cancelled.", "success");
    loadBookings();
    return;
  }

  toast("Could not cancel booking.", "error");
}

// ── TOAST
function toast(msg, type = "success") {
  const c = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.innerHTML = `<span class="toast-icon">${type === "success" ? "✓" : "✕"}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    el.style.transition = "all 0.3s";
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ── INIT
const _setVal = (id, v) => {
  const e = document.getElementById(id);
  if (e) e.value = v;
};
_setVal("searchCheckIn", fmt(tomorrow));
_setVal("searchCheckOut", fmt(dayAfter));
_setVal("bookCheckIn", fmt(tomorrow));
_setVal("bookCheckOut", fmt(dayAfter));

renderNavAuth();
loadHotels();
loadCities();
loadRoomTypes();
