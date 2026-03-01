import express from "express";
import { PORT } from "./config";
import identifyRoute from "./routes/identify";

const app = express();

// Middleware: parse JSON request bodies
app.use(express.json());

// health check endpoint (useful for Render / checking if server is alive)
app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "Bitespeed Identity Reconciliation Service" });
});

// mounting the /identify route
app.use("/identify", identifyRoute);

// starting the server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
