import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "subadmin"],
    default: "subadmin",
  },
  subRole: {
    type: String,
    enum: ["viewer", "editor"],
    default: "viewer",
  },
  assignedPage: { type: String, default: "/" },
  profileImage: { type: String, required: false }, // Optional
});

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
