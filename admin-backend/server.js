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
import { verifyFirebaseToken } from "./middleware/firebaseAuth.js";
import { pubsub } from "./pubsub.js";

import multer from "multer";
import { uploadToFirebase } from "./utils/uploadToFirebase.js";
import sellerAuthRouter from "./routes/sellerAuth.js";

import { typeDefs } from "./schema/typeDefs/index.js";
import { resolves } from "./resolvers/resolves/index.js";

import { GraphQLScalarType, Kind } from "graphql";

dotenv.config();
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    const app = express();

    /* -------------------------------------------------------------------------- */
    /*                               EXPRESS SETUP                                */
    /* -------------------------------------------------------------------------- */
    app.use(cors());
    app.use(express.json());
    // app.use("/uploads", express.static("uploads"));
    app.use(verifyFirebaseToken);

    app.use("/auth", sellerAuthRouter);

    const storage = multer.memoryStorage();
    const upload = multer({ storage });

    /* ------------------------------ HEALTH CHECK ------------------------------ */
    app.get("/healthz", (_req, res) => res.json({ ok: true }));

    /* --------------------------- DIRECT FILE UPLOAD --------------------------- */
    app.post("/upload", upload.single("file"), async (req, res) => {
      try {
        if (!req.file) {
          return res
            .status(400)
            .json({ success: false, message: "No file uploaded" });
        }

        const folder = req.body.folder || "hire-pilots";
        const firebaseUser = req.firebaseUser;
        const publicUrl = await uploadToFirebase(req.file, folder);

        console.log(
          `📤 ${firebaseUser?.email || "anonymous"} uploaded to ${folder}`
        );
        res.json({
          success: true,
          url: publicUrl,
          uploader: firebaseUser?.email,
          message: "✅ File uploaded successfully",
        });
      } catch (err) {
        console.error("❌ Upload Error:", err);
        res.status(500).json({ success: false, message: err.message });
      }
    });

    /* ----------------------------- GRAPHQL UPLOAD ----------------------------- */
    app.use(graphqlUploadExpress({ maxFileSize: 10_000_000, maxFiles: 10 }));

    /* ---------------------------- CONNECT DATABASE ---------------------------- */
    await connectDB();

    /* -------------------------------------------------------------------------- */
    /*                              GRAPHQL DATE SCALAR                           */
    /* -------------------------------------------------------------------------- */

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

    /* -------------------------------------------------------------------------- */
    /*                             MERGE TYPEDEFS/RESOLVERS                       */
    /* -------------------------------------------------------------------------- */

    const baseTypeDefs = `
      scalar Date
      type Query { _empty: String }
      type Mutation { _empty: String }
      type Subscription { _empty: String }
    `;

    const mergedTypeDefs = mergeTypeDefs([baseTypeDefs, ...typeDefs]);

    const mergedResolvers = mergeResolvers([
      { Date: DateScalar },   // <-- IMPORTANT
      ...resolves,
    ]);

    const schema = makeExecutableSchema({
      typeDefs: mergedTypeDefs,
      resolvers: mergedResolvers,
    });

    /* -------------------------------------------------------------------------- */
    /*                              APOLLO SERVER                                 */
    /* -------------------------------------------------------------------------- */

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

    /* -------------------------------------------------------------------------- */
    /*                        HTTP + WEBSOCKET SERVER SETUP                       */
    /* -------------------------------------------------------------------------- */

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
