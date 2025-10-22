# InspireStack — Git Clone & Setup Guide

This guide helps you clone and set up the **InspireStack** project — which has separate **frontend** and **backend** directories.

---

## 🧩 Folder Structure

```
inspirestack/
├── frontend/     # React (or Next.js) client-side application
└── backend/      # Node.js (Express) server-side API
```

---

## ⚙️ Prerequisites

* **Node.js** (v16 or later)
* **npm** (comes with Node.js)
* **Git** installed and configured (`git --version`)

---

## 🚀 Clone the Repository

## Terminal

git clone <git repositery>
cd inspirestack


If you use SSH:

## Terminal
git clone git@github.com:OWNER/inspirestack.git
cd inspirestack


---

## 📦 Install Dependencies

Install all dependencies for both the **frontend** and **backend**:


# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install


---

## ▶️ Run the Project

### Start the Frontend

cd frontend
npm run dev


This runs the development server (usually at `http://localhost:5173` or similar depending on your setup).

### Start the Backend


cd backend
npm start




---

✅ You’re all set! Run both servers and open your browser to start using **InspireStack**.
