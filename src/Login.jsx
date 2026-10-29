import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const ADMIN_EMAIL = "admin@ruthvikfoods.com";
const ADMIN_PASSWORD = "Admin@123";

function Login() {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password.trim()) {
      setMessage("Please enter your email and password.");
      return;
    }

    // ADMIN LOGIN
    if (isLogin && normalizedEmail === ADMIN_EMAIL) {
      if (password === ADMIN_PASSWORD) {
        const adminUser = {
          id: "ruthvik-admin",
          name: "Admin",
          email: ADMIN_EMAIL,
          role: "admin",
        };

        sessionStorage.setItem(
          "ruthvik_foods_current_user",
          JSON.stringify(adminUser)
        );

        navigate("/admin", { replace: true });
      } else {
        setMessage("Incorrect email or password. Please try again.");
      }

      return;
    }

    let users = [];

    try {
      users = JSON.parse(
        localStorage.getItem("ruthvik_foods_users") || "[]"
      );
    } catch {
      setMessage("Unable to read account details. Please try again.");
      return;
    }

    // NORMAL USER LOGIN
    if (isLogin) {
      const user = users.find(
        (u) =>
          u.email?.toLowerCase() === normalizedEmail &&
          u.password === password
      );

      if (!user) {
        setMessage("Invalid email or password.");
        return;
      }

      const loggedInUser = {
        id: user.id || Date.now().toString(),
        name: user.name,
        email: user.email,
        role: "user",
      };

      sessionStorage.setItem(
        "ruthvik_foods_current_user",
        JSON.stringify(loggedInUser)
      );

      navigate("/", { replace: true });
    } else {
      // SIGN UP
      if (!name.trim()) {
        setMessage("Please enter your full name.");
        return;
      }

      if (normalizedEmail === ADMIN_EMAIL) {
        setMessage("This email is reserved for the administrator.");
        return;
      }

      if (users.some((u) => u.email?.toLowerCase() === normalizedEmail)) {
        setMessage("This email is already registered. Please login.");
        return;
      }

      const newUser = {
        id: Date.now().toString(),
        name: name.trim(),
        email: normalizedEmail,
        password,
      };

      users.push(newUser);

      try {
        localStorage.setItem(
          "ruthvik_foods_users",
          JSON.stringify(users)
        );

        setMessage("Account created successfully! Please login.");
        setIsLogin(true);
        setName("");
        setPassword("");
      } catch {
        setMessage("Could not create account. Please try again.");
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />

      <button
        type="button"
        className="login-home-button"
        onClick={() => navigate("/")}
      >
        ← Back to Home
      </button>

      <main className="login-card">
        <div className="login-brand-icon">🍽️</div>

        <p className="login-eyebrow">WELCOME TO</p>
        <h1 className="login-heading">
          Ruthvik <span>Foods</span>
        </h1>

        <p className="login-subtitle">
          {isLogin
            ? "Your favourite food is just a login away."
            : "Create an account and discover delicious food."}
        </p>

        <div className="login-tabs">
          <button
            type="button"
            className={isLogin ? "login-tab active" : "login-tab"}
            onClick={() => {
              setIsLogin(true);
              setMessage("");
              setPassword("");
            }}
          >
            Login
          </button>

          <button
            type="button"
            className={!isLogin ? "login-tab active" : "login-tab"}
            onClick={() => {
              setIsLogin(false);
              setMessage("");
              setPassword("");
            }}
          >
            Sign Up
          </button>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
          autoComplete="off"
        >
          {!isLogin && (
            <div className="login-field">
              <label htmlFor="login-name">Full Name</label>
              <input
                id="login-name"
                type="text"
                name="new-account-name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
          )}

          <div className="login-field">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              name="account-email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>

            <div className="login-password-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="account-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {message && (
            <div
              className={
                message.includes("successfully")
                  ? "login-message success"
                  : "login-message error"
              }
              role="status"
            >
              {message}
            </div>
          )}

          <button type="submit" className="login-submit">
            <span>
              {isLogin ? "Login to Your Account" : "Create Your Account"}
            </span>
            <span className="login-submit-arrow">→</span>
          </button>
        </form>

        <div className="login-divider">
          <span>GOOD FOOD. GOOD MOOD.</span>
        </div>

        <p className="login-footer">
          {isLogin ? "New to Ruthvik Foods?" : "Already have an account?"}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage("");
              setPassword("");
            }}
          >
            {isLogin ? "Create account" : "Login"}
          </button>
        </p>
      </main>

      <p className="login-bottom-text">
        Made with ❤️ for food lovers
      </p>
    </div>
  );
}

export default Login;