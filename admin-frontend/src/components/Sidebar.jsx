import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  FaUserFriends,
  FaPlane,
  FaCogs,
  FaHome,
  FaTools,
  FaRegNewspaper,
  FaServicestack,
  FaChevronDown,
  FaChevronRight,
  FaUserTie,
  FaUndoAlt,
  FaUserTag,
  FaBriefcase,
  FaShoppingCart,
  FaHelicopter,
  FaSignOutAlt,
  FaBookOpen,
  FaBuilding,
  FaUserCircle,
} from "react-icons/fa";

import { MdLocalShipping } from "react-icons/md";
import "../styles/Sidebar.css";

function Sidebar() {
  const [openUsers, setOpenUsers] = useState(false);
  const [openSeller, setOpenSeller] = useState(false);
  const [openBuyer, setOpenBuyer] = useState(false);
  const [openRentals, setOpenRentals] = useState(false);
  const [openUserBookings, setOpenUserBookings] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  const isParentActive = (paths) =>
    paths.some((path) => location.pathname.startsWith(path));

  const toggleUsers = () => setOpenUsers(!openUsers);
  const toggleSeller = () => setOpenSeller(!openSeller);
  const toggleBuyer = () => setOpenBuyer(!openBuyer);
  const toggleRentals = () => setOpenRentals(!openRentals);
  const toggleUserBookings = () => setOpenUserBookings(!openUserBookings);

  useEffect(() => {
    setOpenUsers(prev => isParentActive([
      "/drones",
      "/parts",
      "/accessories",
      "/seller",
      "/services",
      "/RegisteredSeller",
      "/return-product",
      "/sold-product",
      "/orders",
      "/RegisteredBuyer",
      "/PilotBookingStatus",
    ]) ? true : prev);

    setOpenSeller(prev => isParentActive([
      "/drones",
      "/parts",
      "/accessories",
      "/seller",
      "/services",
      "/RegisteredSeller",
    ]) ? true : prev);

    setOpenBuyer(prev => isParentActive([
      "/return-product",
      "/sold-product",
      "/orders",
      "/RegisteredBuyer",
      "/PilotBookingStatus",
    ]) ? true : prev);

    setOpenRentals(prev => isParentActive(["/rentals", "/pilot", "/job"]) ? true : prev);

    setOpenUserBookings(prev => isParentActive([
      "/PilotBookingStatus",
      "/jobApplicationView",
      "/DroneBookingStatus",
      "/TrainingBookingStatus",
    ]) ? true : prev);
  }, [location.pathname]);

  return (
    <aside className="sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <img src="/flyhubicon.svg" alt="Flyhub Logo" className="sidebar-logo" />
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul>
          {/* Dashboard */}
{/* 
           <li>
            <Link to="/popup" className={isActive("/popup") ? "active" : ""}>
              <FaHome /> Popup
            </Link>
          </li> */}

          {/* USERS */}
          <li className={`dropdown ${openUsers ? "open" : ""}`}>
            <div
              className={`dropdown-toggle ${
                isParentActive([
                  "/drones",
                  "/parts",
                  "/accessories",
                  "/seller",
                  "/services",
                  "/RegisteredSeller",
                  "/return-product",
                  "/sold-product",
                  "/orders",
                  "/RegisteredBuyer",
                  "/PilotBookingStatus",
                ])
                  ? "active-parent"
                  : ""
              }`}
              onClick={toggleUsers}
            >
              <FaUserFriends /> Users
              {openUsers ? <FaChevronDown /> : <FaChevronRight />}
            </div>

            {openUsers && (
              <ul className="dropdown-menu">
                {/* SELLER */}
                <li className={`dropdown ${openSeller ? "open" : ""}`}>
                  <div
                    className={`dropdown-toggle ${
                      isParentActive([
                        "/drones",
                        "/parts",
                        "/accessories",
                        "/seller",
                        "/services",
                        "/RegisteredSeller",
                      ])
                        ? "active-parent"
                        : ""
                    }`}
                    onClick={toggleSeller}
                  >
                    <FaUserTag /> Seller
                    {openSeller ? <FaChevronDown /> : <FaChevronRight />}
                  </div>

                  {openSeller && (
                    <ul className="dropdown-submenu">
                      <li>
                        <Link
                          to="/drones"
                          className={isActive("/drones") ? "active" : ""}
                        >
                          <FaPlane /> Drones
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/parts"
                          className={isActive("/parts") ? "active" : ""}
                        >
                          <FaCogs /> Parts
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/accessories"
                          className={isActive("/accessories") ? "active" : ""}
                        >
                          <FaTools /> Accessories
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/seller"
                          className={isActive("/seller") ? "active" : ""}
                        >
                          <FaBuilding /> Seller Approval
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/seller-details"
                          className={isActive("/seller-details") ? "active" : ""}
                        >
                          <FaUserCircle /> Seller Details
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/services"
                          className={isActive("/services") ? "active" : ""}
                        >
                          <FaServicestack /> Services
                        </Link>
                      </li>
                    </ul>
                  )}
                </li>

                {/* BUYER */}
                <li className={`dropdown ${openBuyer ? "open" : ""}`}>
                  <div
                    className={`dropdown-toggle ${
                      isParentActive([
                        "/return-product",
                        "/sold-product",
                        "/orders",
                        "/RegisteredBuyer",
                        "/PilotBookingStatus",
                      ])
                        ? "active-parent"
                        : ""
                    }`}
                    onClick={toggleBuyer}
                  >
                    <FaUserTie /> Buyer
                    {openBuyer ? <FaChevronDown /> : <FaChevronRight />}
                  </div>

                  {openBuyer && (
                    <ul className="dropdown-submenu">
                       <li>
                        <Link
                          to="/buyer-address"
                          className={isActive("/buyer-address") ? "active" : ""}
                        >
                          <FaUndoAlt /> Buyer Address
                        </Link>
                      </li>
                       <li>
                        <Link
                          to="/buyer-cart"
                          className={isActive("/buyer-cart") ? "active" : ""}
                        >
                          <FaUndoAlt /> Buyer Cart
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/return-product"
                          className={isActive("/return-product") ? "active" : ""}
                        >
                          <FaUndoAlt /> Return Product
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/sold-product"
                          className={isActive("/sold-product") ? "active" : ""}
                        >
                          <FaShoppingCart /> Sold Product
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/orders"
                          className={isActive("/orders") ? "active" : ""}
                        >
                          <MdLocalShipping /> Orders
                        </Link>
                      </li>
                      <li>
                        <Link to="/RegisteredBuyer" className={isActive("/RegisteredBuyer") ? "active" : ""}>
                          <MdLocalShipping /> RegisteredBuyer
                        </Link>
                      </li>
                    </ul>
                  )}
                </li>
              </ul>
            )}
          </li>

          {/* RENTALS */}
          <li className={`dropdown ${openRentals ? "open" : ""}`}>
            <div
              className={`dropdown-toggle ${
                isParentActive(["/rentals", "/pilot", "/job"])
                  ? "active-parent"
                  : ""
              }`}
              onClick={toggleRentals}
            >
              <FaTools /> Rentals
              {openRentals ? <FaChevronDown /> : <FaChevronRight />}
            </div>

            {openRentals && (
              <ul className="dropdown-menu">
                <li>
                  <Link
                    to="/rentals"
                    className={isActive("/rentals") ? "active" : ""}
                  >
                    <FaPlane /> Drone Rentals
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pilot"
                    className={isActive("/pilot") ? "active" : ""}
                  >
                    <FaUserTie /> Become a Pilot
                  </Link>
                </li>
                <li>
                  <Link to="/job" className={isActive("/job") ? "active" : ""}>
                    <FaBriefcase /> Job posted by Seller
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* USER BOOKINGS */}
          <li className={`dropdown ${openUserBookings ? "open" : ""}`}>
            <div
              className={`dropdown-toggle ${
                isParentActive([
                  "/PilotBookingStatus",
                  "/jobApplicationView",
                  "/DroneBookingStatus",
                  "/TrainingBookingStatus",
                ])
                  ? "active-parent"
                  : ""
              }`}
              onClick={toggleUserBookings}
            >
              <FaBookOpen /> User Bookings
              {openUserBookings ? <FaChevronDown /> : <FaChevronRight />}
            </div>

            {openUserBookings && (
              <ul className="dropdown-menu">
                <li>
                  <Link
                    to="/PilotBookingStatus"
                    className={isActive("/PilotBookingStatus") ? "active" : ""}
                  >
                    <FaHelicopter /> Pilots booked by Users
                  </Link>
                </li>
                <li>
                  <Link
                    to="/jobApplicationView"
                    className={isActive("/jobApplicationView") ? "active" : ""}
                  >
                    <FaBriefcase /> Job Applied by User
                  </Link>
                </li>
                <li>
                  <Link
                    to="/DroneBookingStatus"
                    className={isActive("/DroneBookingStatus") ? "active" : ""}
                  >
                    <MdLocalShipping /> Drones booked by User
                  </Link>
                </li>
                <li>
                  <Link
                    to="/TrainingBookingStatus"
                    className={
                      isActive("/TrainingBookingStatus") ? "active" : ""
                    }
                  >
                    <FaRegNewspaper /> Trainings booked by User
                  </Link>
                </li>
                 <li>
                  <Link
                    to="/ServiceBookingStatus"
                    className={
                      isActive("/ServiceBookingStatus") ? "active" : ""
                    }
                  >
                    <FaRegNewspaper /> Service booked by User
                  </Link>
                </li>
              </ul>
            )}
          </li>
          <li>
                  <Link
                    to="/regulatory"
                    className={
                      isActive("/regulatory") ? "active" : ""
                    }
                  >
                    <FaRegNewspaper /> Regulatory
                  </Link>
                </li>
                          <li>
                  <Link
                    to="/training-page"
                    className={
                      isActive("/training-page") ? "active" : ""
                    }
                  >
                    <FaRegNewspaper /> Training
                  </Link>
                </li>
        </ul>
      </nav>

      {/* Logout Button - Moved outside navigation */}
      <div className="sidebar-logout">
        <button onClick={handleLogout} className="logout-btn">
          <FaSignOutAlt /> Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;