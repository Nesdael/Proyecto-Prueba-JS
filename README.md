# CineMax - Cinema Reservation System

A Single Page Application (SPA) for managing cinema showings and ticket reservations, built with Vanilla JavaScript and Vite.

---

## Description

CineMax is a web platform that allows users to browse available movie showings and make ticket reservations, while administrators can fully manage the cinema catalog, showings, and all reservations.

The application features role-based access control (RBAC) with two roles: **admin** and **user**, History API-based routing (clean URLs like `/funciones`, `/cartelera`), and session persistence via `localStorage`.

---

## Technologies Used

| Technology | Purpose |
|---|---|
| Vite | Development server and bundler |
| Vanilla JavaScript (ES Modules) | Core application logic |
| json-server | Simulated REST API / fake database |
| HTML5 History API | SPA routing without page reloads |
| localStorage | Session persistence |
| CSS3 (custom, no frameworks) | Styling |

---

## Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd cinemax

# 2. Install dependencies
npm install
```

---

## Running the Project

You need **two terminals open at the same time**:

**Terminal 1 — Start the fake API (json-server):**
```bash
npm run api
# Runs on http://localhost:3000
```

**Terminal 2 — Start the Vite dev server:**
```bash
npm run dev
# Runs on http://localhost:5173
```

Then open your browser at: **http://localhost:5173**

---

## Running json-server

json-server reads `db.json` as its database and exposes a REST API:

```bash
npm run api
```

Available endpoints:
- `GET/POST http://localhost:3000/users`
- `GET/POST http://localhost:3000/funciones`
- `GET/POST/PATCH/DELETE http://localhost:3000/reservas`

---

## Test Users

| Role | Email | Password |
|---|---|---|
| Admin | admin@cinemax.com | Admin123! |
| User 1 | carlos@mail.com | User123! |
| User 2 | maria@mail.com | User123! |

---

## Project Structure

```
cinemax/
├── index.html              # Main HTML entry point
├── db.json                 # json-server database
├── package.json
├── vite.config.js
└── src/
    ├── styles
    │   └──main.css         # Global styles
    ├── main.js             # App entry point - boots the router
    ├── router/
    │   └── router.js       # History API router + route guards
    ├── services/
    │   ├── auth.js         # Login, logout, session management
    │   └── api.js          # All fetch() calls to json-server
    ├── components/
    │   └── navbar.js       # Navbar (renders based on role)
    ├── pages/
    │   ├── login.js        # Login page
    │   ├── cartelera.js    # Movie listings (user view)
    │   ├── funciones.js    # Showings CRUD (admin only)
    │   ├── reservas.js     # All reservations management (admin only)
    │   └── misReservas.js  # User's own reservations
    └── utils/
        └── toast.js        # Toast notification helper
```

---

## Role Permissions

### Admin
| Action | Permission |
|---|---|
| View all reservations | ✅ |
| Create showings | ✅ |
| Edit showings | ✅ |
| Delete showings | ✅ |
| Confirm/cancel any reservation | ✅ |
| Delete any reservation | ✅ |
| View the movie listings | ✅ |

### User
| Action | Permission |
|---|---|
| View available showings (cartelera) | ✅ |
| Make a reservation | ✅ |
| View own reservations only | ✅ |
| Edit own active reservations | ✅ |
| Cancel own reservations | ✅ |
| View other users' reservations | ❌ |
| Access admin modules | ❌ |
| Manage showings | ❌ |

---

## Technical Decisions

### 1. History API over Hash-based routing
Used `history.pushState()` for clean URLs (`/cartelera` instead of `/#/cartelera`). This required configuring the server to serve `index.html` for all routes. In development, Vite handles this automatically.

### 2. Route Guards in the Router
Rather than checking auth inside every page, the router itself contains the guard logic. If a route requires `auth: true` and no session exists, the user is redirected to `/login` before any page code runs.

### 3. Centralized API Service
All `fetch()` calls live in `src/services/api.js`. This means if the API URL changes, there's only one file to update.

### 4. Session stored in localStorage (not sessionStorage)
Using `localStorage` means the session persists even after closing the browser tab. The user stays logged in until they click "Salir" (logout), which calls `localStorage.removeItem()`.

### 5. Automatic seat count updates
When a reservation is created, edited, or cancelled, the system automatically updates `cuposDisponibles` in the corresponding showing record via a PATCH request. This prevents overselling.

### 6. Modular architecture
Each page is a self-contained module that exports a single `render` function. The router calls these functions and injects the resulting HTML into `#app`. This mirrors how component-based frameworks like React or Vue work.

---

## Bonus implementados

| Feature | where is |
|---|---|
| **Dark Mode** | Toggle light/dark en el navbar (cualquier usuario). Se guarda en `localStorage` y se restaura al refrescar. El CSS está en `src/styles.css` al final (clase `.dark-mode` en el body). La lógica del toggle está en `src/components/navbar.js` → `setupNavbar()`. La restauración al cargar está en `src/main.js`. |
| **Buscador** | En `/cartelera` (busca por película o sala) y en `/reservas` (busca por usuario o película). Filtra en tiempo real con el evento `input`. |
| **Filtros por fecha** | En `/cartelera` (filtra funciones por fecha) y en `/reservas` (filtra reservas por fecha de reserva). Se combinan con el buscador. |
| **Notificaciones Toast** | `src/utils/toast.js`. Se usan en todas las páginas: `toast.success()`, `toast.error()`, `toast.info()`. Aparecen en la esquina inferior derecha y desaparecen a los 3 segundos. |