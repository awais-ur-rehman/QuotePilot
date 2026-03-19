import mongoose from "mongoose";
import { env } from "./env";

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 3000;

export async function connectDB(): Promise<void> {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log("✅ MongoDB connected");
      return;
    } catch (error) {
      attempt++;
      if (attempt >= MAX_RETRIES) {
        console.error(`❌ MongoDB connection failed after ${MAX_RETRIES} attempts`);
        throw error;
      }
      console.warn(`⚠️  MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${RETRY_INTERVAL_MS}ms...`);
      await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
    }
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err);
});

export async function closeDB(): Promise<void> {
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
}
