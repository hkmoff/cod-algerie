import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Settings from "./pages/Settings.jsx";
import AdminPending from "./pages/AdminPending.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/s/:subdomain" element={<App />} />
        <Route path="/dashboard/login" element={<Login />} />
        <Route path="/dashboard/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/products" element={<Products />} />
        <Route path="/dashboard/settings" element={<Settings />} />
        <Route path="/dashboard/admin" element={<AdminPending />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
