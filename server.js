import express from "express";
import dotenv from "dotenv";
import { analyzeContract } from "./extension/contractAnalyzer.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.post("/analyze", async (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing contract text" });
  }

  try {
    const result = await analyzeContract(text);
    res.json(result);
  } catch (err) {
    console.error("Analyzer failed:", err);
    res.status(500).json({ error: "Failed to analyze contract" });
  }
});

app.listen(PORT, () => {
  console.log(`Analyzer server ready at http://localhost:${PORT}`);
});

