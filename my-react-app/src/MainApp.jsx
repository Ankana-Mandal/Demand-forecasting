import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage"; //landing page
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import DemandForecastingApp from "./DemandForecastingApp"; // teammate’s dashboard

function MainApp() {
  return (
    <Router>
      <Routes>
        {/* Landing Page - first screen */}
        <Route path="/" element={<LandingPage />} />
        {/* Auth/Login Page */}
        <Route path="/auth" element={<AuthPage />} />
        {/* Protected Dashboard */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DemandForecastingApp />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default MainApp;
