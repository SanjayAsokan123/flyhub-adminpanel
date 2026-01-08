import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import Users from "./pages/Users";
import Drones from "./pages/Drones";
import Parts from "./pages/Parts";
import SellerDetails from "./pages/SellerDetails";
import Accessories from "./pages/Accessories";
import SoldProducts from "./pages/SoldProducts";
import Services from "./pages/Service";
import Rentals from "./pages/Rental";
import Orders from "./pages/OrderPage";
import HirePilot from "./pages/HirePilot";
import HireJob from "./pages/HireJob";
import Regulatory from "./pages/Regulatory";
import Settings from "./pages/Settings";
import Popup from "./pages/Announcement";
import PilotBookingStatus from "./pages/PilotBookingStatus";
import ServiceBookingStatus from "./pages/ServiceBookingStatus";
import DroneBookingStatus from "./pages/DroneBookingStatus";
import JobApplicationView from "./pages/JobApplicationView";
import TrainingBookingStatus from "./pages/TrainingBookingStatus";
import RegisteredBuyer from "./pages/RegisteredBuyer";
import SellerApprovalPanel from "./pages/SellerApprovalPanel";
import ReturnProductsForm from "./pages/ReturnProductsForm";
import DroneRentalForm from "./pages/DroneRentalForm";
import BuyersAddress from "./pages/BuyerAddress";
import BuyerCart from "./pages/BuyerCart";
import ManageAdmins from "./pages/ManageAdmins";
import TaxSettingsForm from "./pages/Tax";
import Login from "./pages/Login";

import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";
import TrainingPage from "./pages/Training";
import BuyerPilot from "./pages/BuyerPilot";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  {/* <Route path="/D" element={<Dashboard />} /> */}
                  <Route path="/users" element={<Users />} />
                  <Route path="/drones" element={<Drones />} />
                  <Route path="/parts" element={<Parts />} />
                  <Route path="/accessories" element={<Accessories />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/rentals" element={<Rentals />} />
                  <Route path="/sold-product" element={<SoldProducts />} />
                  <Route path="/regulatory" element={<Regulatory />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/announcement" element={<Popup />} />
                  <Route path="/pilot" element={<HirePilot />} />
                  <Route path="/job" element={<HireJob />} />
                  <Route path="/orders" element={<Orders/>} />
                  <Route path="/seller" element={<SellerApprovalPanel />} />
                  <Route path="/PilotBookingStatus" element={<PilotBookingStatus/>} />
                  <Route path="/ServiceBookingStatus" element={<ServiceBookingStatus/>} />
                   <Route path="/JobApplicationView" element={<JobApplicationView/>} />
                   <Route path="/TrainingBookingStatus" element={<TrainingBookingStatus/>} />
                  <Route path="/DroneBookingStatus" element={<DroneBookingStatus/>} />
                   <Route path="/RegisteredBuyer" element={<RegisteredBuyer/>} />
                   <Route path="/manage-admins" element={<ManageAdmins />} />
                   <Route path="/training-page" element={<TrainingPage />} />
                  <Route path="/buyer-address" element={<BuyersAddress />} />
                  <Route path="/buyer-cart" element={<BuyerCart />} />
                  <Route path="/buyer-pilot" element={<BuyerPilot />} />
                   <Route path="/drone-rental-form" element={<DroneRentalForm />} />
                  <Route path="/return-product" element={<ReturnProductsForm />} />
                  <Route path="/tax" element={<TaxSettingsForm />} />
                  <Route path="/seller-details" element={<SellerDetails />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}