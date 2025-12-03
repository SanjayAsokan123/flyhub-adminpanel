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
      };
    },
  },

  Mutation: {
    adminRegister: async (_, { name, email, password }) => {
      const existing = await Admin.findOne({ email });
      if (existing) return { success: false, message: "Admin already exists" };
      const hashed = await bcrypt.hash(password, 10);
      await new Admin({ name, email, password: hashed }).save();
      return { success: true, message: "Admin registered successfully" };
    },

    adminLogin: async (_, { email, password }) => {
      const admin = await Admin.findOne({ email });
      if (!admin) return { success: false, message: "Admin not found" };
      const match = await bcrypt.compare(password, admin.password);
      if (!match) return { success: false, message: "Invalid password" };

      const accessToken = jwt.sign(
        { id: admin._id, email: admin.email, role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
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
      };
    },

    refreshAdminToken: async (_, { refreshToken }) => {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const admin = await Admin.findById(decoded.id);
        if (!admin) throw new Error("Admin not found");
        const token = jwt.sign(
          { id: admin._id, email: admin.email, role: "admin" },
          process.env.JWT_SECRET,
          { expiresIn: "15m" }
        );
        return { success: true, message: "Token refreshed", token };
      } catch {
        return { success: false, message: "Invalid or expired refresh token" };
      }
    },
  },
};
