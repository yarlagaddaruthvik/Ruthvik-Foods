import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute() {
  const location = useLocation();

  let user = null;

  try {
    user = JSON.parse(
      sessionStorage.getItem("ruthvik_foods_current_user") || "null"
    );
  } catch {
    user = null;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}