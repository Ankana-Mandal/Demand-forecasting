import React, { useState } from "react";
import { LogIn, UserPlus, Mail, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./AuthPage.css";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    adminCode: ""
  });

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const endpoint = isLogin
  ? "http://localhost:5001/api/auth/login"
  : "http://localhost:5001/api/auth/register";

      const payload = {
        email: formData.email,
        password: formData.password,
      };

      if (!isLogin) {
        payload.name = "New User";
        payload.adminCode = formData.adminCode;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      // ❌ Backend error (like wrong admin code, duplicate email, bad password)
      if (!res.ok) {
        alert(data.message || "Authentication failed!");
        return;
      }

      // Save token + user in localStorage
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("authUser", JSON.stringify(data.user));

      // Success message
      alert(`${isLogin ? "Login" : "Signup"} successful!`);

      // Redirect based on role
      if (data.user.role === "admin") {
        navigate("/dashboard");
      } else {
        navigate("/dashboard");
      }

    } catch (err) {
      console.error("Error:", err);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="icon-container">
          {isLogin ? <LogIn size={42} color="#4F46E5" /> : <UserPlus size={42} color="#4F46E5" />}
        </div>

        <h2>{isLogin ? "Login to your account" : "Create an account"}</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>Email</label>
          <div className="input-box">
            <Mail size={18} color="#888" />
            <input
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <label>Password</label>
          <div className="input-box">
            <Lock size={18} color="#888" />
            <input
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          {/* extra fields for SIGNUP */}
          {!isLogin && (
            <>
              <label>Confirm Password</label>
              <div className="input-box">
                <Lock size={18} color="#888" />
                <input type="password" placeholder="Re-enter password" required />
              </div>

              <label>Admin Code</label>
              <div className="input-box">
                <input
                  type="text"
                  placeholder="Enter admin access code"
                  value={formData.adminCode}
                  onChange={(e) =>
                    setFormData({ ...formData, adminCode: e.target.value })
                  }
                />
              </div>
            </>
          )}

          <button type="submit" className="auth-button">
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        <p className="toggle-text">
          {isLogin ? "Don’t have an account?" : "Already have an account?"}{" "}
          <button className="toggle-btn" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
