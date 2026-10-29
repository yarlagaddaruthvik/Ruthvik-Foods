import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Heart,
  RefreshCw,
  Search,
  ArrowLeft,
  PackageCheck,
  TrendingUp,
  Download,
  UtensilsCrossed,
  IndianRupee,
  Menu,
  X,
} from "lucide-react";
import "./AdminDashboard.css";

const ORDERS_KEY = "ruthvik_foods_orders";
const ADMIN_EMAIL = "admin@ruthvikfoods.com";

function readJSON(key, fallback) {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || JSON.stringify(fallback)
    );
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function getCurrentUser() {
  try {
    return JSON.parse(
      sessionStorage.getItem("ruthvik_foods_current_user") || "null"
    );
  } catch {
    return null;
  }
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState(() =>
    readJSON(ORDERS_KEY, [])
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const reload = () => {
    setOrders(readJSON(ORDERS_KEY, []));
    setRefreshKey((value) => value + 1);
  };

  const allUsers = useMemo(() => {
    const users = new Map();
    const rawUsers = readJSON("ruthvik_foods_users", []);

    if (Array.isArray(rawUsers)) {
      rawUsers.forEach((customer) => {
        if (customer?.email) {
          users.set(customer.email.toLowerCase(), {
            name: customer.name || "Customer",
            email: customer.email,
          });
        }
      });
    }

    orders.forEach((order) => {
      if (order.customerEmail) {
        users.set(order.customerEmail.toLowerCase(), {
          name: order.customerName || "Customer",
          email: order.customerEmail,
        });
      }
    });

    Object.keys(localStorage)
      .filter(
        (key) =>
          key.startsWith("ruthvik_foods_cart:") ||
          key.startsWith("ruthvik_foods_wishlist:")
      )
      .forEach((key) => {
        const email = key.split(":").slice(1).join(":");

        if (email && email !== "guest" && !users.has(email.toLowerCase())) {
          users.set(email.toLowerCase(), {
            name: email.split("@")[0],
            email,
          });
        }
      });

    return [...users.values()];
  }, [orders, refreshKey]);

  const customerData = useMemo(() => {
    return allUsers.map((customer) => {
      const email = customer.email.toLowerCase();

      const cart = readJSON(`ruthvik_foods_cart:${email}`, []);
      const wishlist = readJSON(`ruthvik_foods_wishlist:${email}`, []);

      const userOrders = orders.filter(
        (order) =>
          order.customerEmail?.toLowerCase() === email
      );

      const cartValue = Array.isArray(cart)
        ? cart.reduce(
            (sum, item) =>
              sum + Number(item.price || 0) * Number(item.quantity || 0),
            0
          )
        : 0;

      return {
        ...customer,
        cart: Array.isArray(cart) ? cart : [],
        wishlist: Array.isArray(wishlist) ? wishlist : [],
        orders: userOrders,
        cartValue,
      };
    });
  }, [allUsers, orders, refreshKey]);

  const revenue = orders
    .filter((order) => order.status !== "Cancelled")
    .reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

  const activeOrders = orders.filter(
    (order) =>
      !["Delivered", "Cancelled"].includes(order.status)
  ).length;

  const filteredOrders = orders.filter((order) => {
    const term = query.trim().toLowerCase();

    const matchesQuery =
      !term ||
      [
        order.id,
        order.customerName,
        order.customerEmail,
        order.address,
      ].some((value) =>
        String(value || "").toLowerCase().includes(term)
      );

    const matchesStatus =
      statusFilter === "All" || order.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  const updateStatus = (orderId, status) => {
    const updatedOrders = orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            status,
            updatedAt: new Date().toISOString(),
          }
        : order
    );

    localStorage.setItem(
      ORDERS_KEY,
      JSON.stringify(updatedOrders)
    );

    setOrders(updatedOrders);
  };

  const exportOrders = () => {
    const header = [
      "Order ID",
      "Customer",
      "Email",
      "Address",
      "Items",
      "Subtotal",
      "Delivery Fee",
      "Total",
      "Status",
      "Created At",
    ];

    const rows = orders.map((order) => [
      order.id,
      order.customerName,
      order.customerEmail,
      order.address,
      (order.items || [])
        .map((item) => `${item.name} x${item.quantity}`)
        .join("; "),
      order.subtotal,
      order.deliveryFee,
      order.total,
      order.status,
      order.createdAt,
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "ruthvik-foods-orders.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  if (user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    return (
      <div className="admin-denied">
        <div className="admin-denied-card">
          <span className="admin-denied-icon">🔐</span>
          <h1>Admin access only</h1>
          <p>
            Please log in with the administrator account to access
            the dashboard.
          </p>
          <button onClick={() => navigate("/login")}>
            Go to Login
          </button>
          <button
            className="admin-secondary"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {sidebarOpen && (
        <button
          className="admin-mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`admin-sidebar ${
          sidebarOpen ? "admin-sidebar-open" : ""
        }`}
      >
        <button
          className="admin-logo"
          onClick={() => navigate("/")}
        >
          <span className="admin-logo-icon">
            <UtensilsCrossed size={25} />
          </span>

          <span className="admin-logo-text">
            Ruthvik <b>Foods</b>
            <small>ADMIN PANEL</small>
          </span>

          <button
            type="button"
            className="admin-close-sidebar"
            aria-label="Close sidebar"
            onClick={(event) => {
              event.stopPropagation();
              setSidebarOpen(false);
            }}
          >
            <X size={20} />
          </button>
        </button>

        <div className="admin-sidebar-section">
          <p className="admin-nav-label">MAIN MENU</p>

          <button
            className="admin-nav admin-nav-active"
            onClick={() => {
              setActiveTab("orders");
              setSidebarOpen(false);
            }}
          >
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
          </button>

          <button
            className={`admin-nav ${
              activeTab === "orders" ? "admin-nav-active" : ""
            }`}
            onClick={() => {
              setActiveTab("orders");
              setSidebarOpen(false);
            }}
          >
            <ShoppingBag size={19} />
            <span>Orders</span>
            <span className="admin-nav-count">{orders.length}</span>
          </button>

          <button
            className={`admin-nav ${
              activeTab === "customers" ? "admin-nav-active" : ""
            }`}
            onClick={() => {
              setActiveTab("customers");
              setSidebarOpen(false);
            }}
          >
            <Users size={19} />
            <span>Customers</span>
            <span className="admin-nav-count">
              {allUsers.length}
            </span>
          </button>
        </div>

        <div className="admin-sidebar-bottom">
          <div className="admin-admin-profile">
            <div className="admin-avatar">A</div>
            <div>
              <strong>Administrator</strong>
              <span>admin@ruthvikfoods.com</span>
            </div>
          </div>

          <div className="admin-online-status">
            <span className="admin-online-dot" />
            Dashboard connected
          </div>

          <button
            className="admin-back-store"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={18} />
            Back to Store
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-mobile-menu"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={23} />
            </button>

            <div>
              <p className="admin-breadcrumb">
                RUTHVIK FOODS <span>/</span> ADMIN
              </p>
              <h1>Dashboard Overview</h1>
              <p className="admin-topbar-subtitle">
                Manage your store and monitor business activity.
              </p>
            </div>
          </div>

          <div className="admin-top-actions">
            <button
              className="admin-refresh-button"
              onClick={reload}
            >
              <RefreshCw size={17} />
              <span>Refresh Data</span>
            </button>

            <div className="admin-top-avatar">A</div>
          </div>
        </header>

        <section className="admin-welcome">
          <div className="admin-welcome-content">
            <span className="admin-welcome-label">
              ADMIN WORKSPACE
            </span>
            <h2>Good day, Admin 👋</h2>
            <p>
              Monitor orders, customer carts, wishlists and sales
              from your dashboard.
            </p>
          </div>

          <button
            className="admin-export-button"
            onClick={exportOrders}
          >
            <Download size={18} />
            Export Orders CSV
          </button>
        </section>

        <section className="admin-stats-grid">
          <article className="admin-stat">
            <div className="admin-stat-icon admin-orange">
              <ShoppingBag size={23} />
            </div>
            <div className="admin-stat-info">
              <p>Total Orders</p>
              <strong>{orders.length}</strong>
              <small>All recorded orders</small>
            </div>
          </article>

          <article className="admin-stat">
            <div className="admin-stat-icon admin-purple">
              <IndianRupee size={23} />
            </div>
            <div className="admin-stat-info">
              <p>Order Revenue</p>
              <strong>{formatCurrency(revenue)}</strong>
              <small>Excludes cancelled orders</small>
            </div>
          </article>

          <article className="admin-stat">
            <div className="admin-stat-icon admin-blue">
              <PackageCheck size={23} />
            </div>
            <div className="admin-stat-info">
              <p>Active Orders</p>
              <strong>{activeOrders}</strong>
              <small>Pending delivery</small>
            </div>
          </article>

          <article className="admin-stat">
            <div className="admin-stat-icon admin-green">
              <Users size={23} />
            </div>
            <div className="admin-stat-info">
              <p>Total Customers</p>
              <strong>{allUsers.length}</strong>
              <small>Known local accounts</small>
            </div>
          </article>
        </section>

        {activeTab === "orders" ? (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Recent Orders</h2>
                <p>Review customer orders and update their status.</p>
              </div>

              <span className="admin-record-count">
                {filteredOrders.length} records
              </span>
            </div>

            <div className="admin-filters">
              <label className="admin-search">
                <Search size={19} />
                <input
                  type="text"
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  placeholder="Search order, customer or address..."
                />
              </label>

              <select
                className="admin-filter-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="All">All Statuses</option>
                <option value="Placed">Placed</option>
                <option value="Preparing">Preparing</option>
                <option value="Out for Delivery">
                  Out for Delivery
                </option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="admin-empty">
                <span className="admin-empty-icon">📦</span>
                <h3>No orders found</h3>
                <p>
                  Orders will appear here when customers place them.
                </p>
                {(query || statusFilter !== "All") && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setStatusFilter("All");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ORDER</th>
                      <th>CUSTOMER</th>
                      <th>ITEMS</th>
                      <th>ADDRESS</th>
                      <th>TOTAL</th>
                      <th>STATUS</th>
                      <th>UPDATE</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.map((order, index) => (
                      <tr key={order.id || index}>
                        <td>
                          <b>#{order.id || "N/A"}</b>
                          <small>
                            {order.createdAt
                              ? new Date(
                                  order.createdAt
                                ).toLocaleString()
                              : "Date unavailable"}
                          </small>
                        </td>

                        <td>
                          <b>
                            {order.customerName || "Customer"}
                          </b>
                          <small>
                            {order.customerEmail || "No email"}
                          </small>
                        </td>

                        <td className="admin-items-cell">
                          {(order.items || [])
                            .map(
                              (item) =>
                                `${item.name} × ${item.quantity}`
                            )
                            .join(", ") || "—"}
                        </td>

                        <td className="admin-address-cell">
                          {order.address || "—"}
                        </td>

                        <td className="admin-money">
                          {formatCurrency(order.total)}
                        </td>

                        <td>
                          <span
                            className={`admin-status status-${String(
                              order.status || "Placed"
                            )
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {order.status || "Placed"}
                          </span>
                        </td>

                        <td>
                          <select
                            className="admin-status-select"
                            value={order.status || "Placed"}
                            onChange={(event) =>
                              updateStatus(
                                order.id,
                                event.target.value
                              )
                            }
                          >
                            <option value="Placed">Placed</option>
                            <option value="Preparing">
                              Preparing
                            </option>
                            <option value="Out for Delivery">
                              Out for Delivery
                            </option>
                            <option value="Delivered">
                              Delivered
                            </option>
                            <option value="Cancelled">
                              Cancelled
                            </option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Customer Activity</h2>
                <p>
                  View customer carts, wishlists and order totals.
                </p>
              </div>

              <span className="admin-record-count">
                {customerData.length} customers
              </span>
            </div>

            {customerData.length === 0 ? (
              <div className="admin-empty">
                <span className="admin-empty-icon">👥</span>
                <h3>No customer data yet</h3>
                <p>
                  Customer information will appear when accounts
                  are registered or orders are placed.
                </p>
              </div>
            ) : (
              <div className="admin-customer-grid">
                {customerData.map((customer) => (
                  <article
                    className="admin-customer-card"
                    key={customer.email}
                  >
                    <div className="admin-customer-top">
                      <span className="admin-customer-avatar">
                        {(customer.name || "C")
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>

                      <div className="admin-customer-details">
                        <h3>{customer.name}</h3>
                        <p>{customer.email}</p>
                      </div>
                    </div>

                    <div className="admin-customer-metrics">
                      <span>
                        <ShoppingBag size={16} />
                        {customer.orders.length} orders
                      </span>

                      <span>
                        <Heart size={16} />
                        {customer.wishlist.length} wishlist items
                      </span>

                      <span>
                        <PackageCheck size={16} />
                        {customer.cart.reduce(
                          (sum, item) =>
                            sum + Number(item.quantity || 0),
                          0
                        )}{" "}
                        cart items
                      </span>
                    </div>

                    <div className="admin-customer-foot">
                      <div>
                        <span>Cart value</span>
                        <b>{formatCurrency(customer.cartValue)}</b>
                      </div>

                      <div>
                        <span>Order value</span>
                        <b>
                          {formatCurrency(
                            customer.orders.reduce(
                              (sum, order) =>
                                sum + Number(order.total || 0),
                              0
                            )
                          )}
                        </b>
                      </div>
                    </div>

                    {customer.cart.length > 0 && (
                      <div className="admin-mini-list">
                        <b>Cart items</b>
                        <p>
                          {customer.cart
                            .map(
                              (item) =>
                                `${item.name} × ${item.quantity || 1}`
                            )
                            .join(", ")}
                        </p>
                      </div>
                    )}

                    {customer.wishlist.length > 0 && (
                      <div className="admin-mini-list">
                        <b>Wishlist items</b>
                        <p>
                          {customer.wishlist
                            .map((item) =>
                              typeof item === "object"
                                ? item.name || item.id || "Item"
                                : item
                            )
                            .join(", ")}
                        </p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <footer className="admin-storage-note">
          <span>ⓘ</span>
          Data is stored in this browser's localStorage. It is not
          shared across browsers or devices.
        </footer>
      </main>
    </div>
  );
}