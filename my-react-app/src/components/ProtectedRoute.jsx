// import React from "react";
// import { Navigate } from "react-router-dom";

// export default function ProtectedRoute({ children }) {
//   const token = localStorage.getItem("authToken");
//   return token ? children : <Navigate to="/" />;
// }

import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("authUser") || "{}");

  if (!token) {
    return <Navigate to="/" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    alert("You do not have permission to access this page.");
    return <Navigate to="/" />;
  }

  return children;
}
