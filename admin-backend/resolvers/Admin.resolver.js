import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.model.js";

export const adminResolvers = {
  Query: {
    testAdminToken: async (_, __, context) => {
      if (!context.admin && !context.firebaseUser)
        throw new Error("Unauthorized");
      return {
        id: context.admin?.id || context.firebaseUser?.uid,
        email: context.admin?.email || context.firebaseUser?.email,
        name: context.admin?.name || "Admin",
        role: context.admin?.role || "admin",
      };
    },
    getAllAdmins: async (_, __, context) => {
      // Basic check, ideally check context.admin.role === 'admin'
      if (!context.admin || context.admin.role !== "admin") {
        throw new Error("Unauthorized: Admins only");
      }
      return await Admin.find({});
    },
  },

  Mutation: {
    adminRegister: async (_, { name, email, password }) => {
      // Default registration is for root admin or initial setup
      const existing = await Admin.findOne({ email });
      if (existing) return { success: false, message: "Admin already exists" };
      const hashed = await bcrypt.hash(password, 10);
      await new Admin({ name, email, password: hashed, role: "admin" }).save();
      return { success: true, message: "Admin registered successfully" };
    },

    createSubAdmin: async (
      _,
      { name, email, password, role, subRole, assignedPage, profileImage },
      context
    ) => {
      if (!context.admin || context.admin.role !== "admin") {
        return { success: false, message: "Unauthorized: Only Admins can create users" };
      }
      const existing = await Admin.findOne({ email });
      if (existing) return { success: false, message: "User already exists" };

      const hashed = await bcrypt.hash(password, 10);
      await new Admin({
        name,
        email,
        password: hashed,
        role: role || "subadmin",
        subRole: subRole || "viewer",
        assignedPage: assignedPage || "/",
        profileImage: profileImage || "",
      }).save();

      return { success: true, message: "User created successfully" };
    },

    deleteAdmin: async (_, { id }, context) => {
      if (!context.admin || context.admin.role !== "admin") {
        return { success: false, message: "Unauthorized: Admins only" };
      }
      // Prevent deleting self? (Optional safeguard)
      if (id === context.admin.id) {
        return { success: false, message: "Cannot delete yourself" };
      }
      await Admin.findByIdAndDelete(id);
      return { success: true, message: "User deleted successfully" };
    },

    adminLogin: async (_, { email, password }) => {
      const admin = await Admin.findOne({ email });
      if (!admin) return { success: false, message: "Admin not found" };
      const match = await bcrypt.compare(password, admin.password);
      if (!match) return { success: false, message: "Invalid password" };

      const accessToken = jwt.sign(
        {
          id: admin._id,
          email: admin.email,
          role: admin.role,
          subRole: admin.subRole,
          assignedPage: admin.assignedPage
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      const refreshToken = jwt.sign(
        { id: admin._id, email: admin.email },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );
      return {
        success: true,
        message: "Login successful",
        token: accessToken,
        refreshToken,
        user: admin, // Return user details
      };
    },

    refreshAdminToken: async (_, { refreshToken }) => {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const admin = await Admin.findById(decoded.id);
        if (!admin) throw new Error("Admin not found");
        const token = jwt.sign(
          {
            id: admin._id,
            email: admin.email,
            role: admin.role,
            subRole: admin.subRole,
            assignedPage: admin.assignedPage
          },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );
        return { success: true, message: "Token refreshed", token };
      } catch {
        return { success: false, message: "Invalid or expired refresh token" };
      }
    },
  },
};
