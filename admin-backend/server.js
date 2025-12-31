import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import https from "https";
import fs from "fs";
import path from "path";
import { ApolloServer } from "apollo-server-express";
import { graphqlUploadExpress } from "graphql-upload";
import jwt from "jsonwebtoken";
import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import connectDB from "./config/db.js";
import { verifyFirebaseToken } from "./config/firebaseAuth.js";
import { pubsub } from "./pubsub.js";
import multer from "multer";
import { uploadToFirebase } from "./utils/uploadToFirebase.js";
import sellerAuthRouter from "./routes/sellerAuth.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import { typeDefs } from "./schema/typeDefs/index.js";
import { resolves } from "./resolvers/resolves/index.js";
import { GraphQLScalarType, Kind } from "graphql";
import bodyParser from "body-parser";
import crypto from "crypto";
import { Order } from "./models/Order.model.js";

dotenv.config();

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    const app = express();
    
/* =====================================================
   🔐 RAZORPAY WEBHOOK (RAW BODY REQUIRED)
   ===================================================== */
app.post(
  "/razorpay/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["x-razorpay-signature"];

      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(req.body)
        .digest("hex");

      if (signature !== expected) {
        console.warn("❌ Razorpay webhook signature mismatch");
        return res.status(400).send("Invalid signature");
      }

      const event = JSON.parse(req.body.toString());

      switch (event.event) {
        /* ---------- PAYMENT CAPTURED ---------- */
        case "payment.captured": {
          const payment = event.payload.payment.entity;

          const order = await Order.findOne({
            "payment.razorpayOrderId": payment.order_id,
          });

          if (order && order.payment.status !== "paid") {
            order.payment.status = "paid";
            order.payment.transactionId = payment.id;
            await order.save();
          }
          break;
        }

        /* ---------- REFUND ---------- */
        case "refund.processed": {
          const refund = event.payload.refund.entity;

          const order = await Order.findOne({
            "payment.transactionId": refund.payment_id,
          });

          if (order) {
            order.payment.status = "refunded";
            order.refund = {
              refundId: refund.id,
              amount: refund.amount / 100,
              status: refund.status,
            };
            await order.save();
          }
          break;
        }
      }

      res.json({ status: "ok" });
    } catch (err) {
      console.error("❌ Razorpay webhook error:", err);
      res.status(500).send("Webhook error");
    }
  }
);
   app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.get("/healthz", (_req, res) => res.json({ ok: true }));

// ✅ PUBLIC UPLOAD (NO AUTH)
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const folder = req.body.folder || "training";
    const publicUrl = await uploadToFirebase(req.file, folder);

    res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error("❌ Upload Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ GraphQL upload middleware (must be before auth + Apollo)
app.use(graphqlUploadExpress({ maxFileSize: 10_000_000, maxFiles: 10 }));

// 🔒 Protect everything else
app.use(verifyFirebaseToken);

// REST routes
app.use("/cart", cartRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/auth", sellerAuthRouter);


    await connectDB();

    // ⭐ Custom Date Scalar
    const DateScalar = new GraphQLScalarType({
      name: "Date",
      description: "Custom Date scalar type",
      serialize(value) {
        return value instanceof Date ? value.toISOString() : null;
      },
      parseValue(value) {
        return new Date(value);
      },
      parseLiteral(ast) {
        return ast.kind === Kind.STRING ? new Date(ast.value) : null;
      },
    });

    const baseTypeDefs = `
      scalar Date
      type Query { _empty: String }
      type Mutation { _empty: String }
      type Subscription { _empty: String }
    `;

    const mergedTypeDefs = mergeTypeDefs([baseTypeDefs, ...typeDefs]);

    const mergedResolvers = mergeResolvers([
      { Date: DateScalar },
      ...resolves,
    ]);

    const schema = makeExecutableSchema({
      typeDefs: mergedTypeDefs,
      resolvers: mergedResolvers,
    });

    const server = new ApolloServer({
      schema,
      context: ({ req }) => {
        const authHeader = req.headers.authorization || "";
        const refresh = req.headers["x-refresh-token"];
        const firebaseUser = req.firebaseUser || null;

        if (firebaseUser) return { firebaseUser, pubsub };

        if (authHeader.startsWith("Bearer ")) {
          const token = authHeader.split(" ")[1];

          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            return { admin: decoded, pubsub };
          } catch (err) {
            if (err.name === "TokenExpiredError" && refresh) {
              try {
                const decodedRefresh = jwt.verify(
                  refresh,
                  process.env.JWT_REFRESH_SECRET
                );

                const newToken = jwt.sign(
                  {
                    id: decodedRefresh.id,
                    email: decodedRefresh.email,
                  },
                  process.env.JWT_SECRET,
                  { expiresIn: "15m" }
                );

                return { admin: decodedRefresh, newToken, pubsub };
              } catch {
                console.log("❌ Invalid refresh token");
              }
            }
          }
        }

        return { pubsub };
      },
    });

    await server.start();
    server.applyMiddleware({ app, path: "/graphql" });

    const httpServer = createServer(app);

    const wsServer = new WebSocketServer({
      server: httpServer,
      path: "/graphql",
    });

    useServer(
      { schema, context: () => ({ pubsub }) },
      wsServer
    );

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log("==================================================");
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🚀 HTTP GraphQL: http://localhost:${PORT}/graphql`);
      console.log(`📡 Subscriptions: ws://localhost:${PORT}/graphql`);
      console.log(`📥 Upload endpoint: http://localhost:${PORT}/upload`);
      console.log(`🔥 Firebase Admin: Initialized`);
      console.log("==================================================");
    });
  } catch (err) {
    console.error("❌ Server startup error:", err);
  }
};

startServer();
