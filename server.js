import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import { analyzeContract } from "./extension/contractAnalyzer.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000/analyze";

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
    // Step 1: Analyze contract
    const contractResult = await analyzeContract(text);
    console.log("Contract analysis complete. Company name:", contractResult.companyName);

    // Step 2: If company name found, get Reddit reviews
    let redditReviews = null;
    if (contractResult.companyName) {
      console.log(`Fetching Reddit reviews for: ${contractResult.companyName}`);
      try {
        const redditResponse = await axios.post(
          FASTAPI_URL,
          { company_name: contractResult.companyName },
          { timeout: 30000 } // 30 second timeout
        );
        redditReviews = redditResponse.data;
        console.log("Reddit analysis complete. Sentiment:", redditReviews.overall_sentiment);
      } catch (redditErr) {
        console.error("Reddit analysis failed:", redditErr.message);
        // Continue without Reddit data rather than failing entirely
        redditReviews = {
          error: "Failed to fetch Reddit reviews",
          overall_sentiment: "unclear",
          risk_level: "unknown",
          summary: "Could not retrieve Reddit reviews at this time.",
          red_flags: [],
          positive_notes: [],
          sample_experiences: [],
          sources: []
        };
      }
    } else {
      console.log("No company name found in contract, skipping Reddit analysis");
    }

    // Step 3: Return combined results
    res.json({
      ...contractResult,
      redditReviews
    });
  } catch (err) {
    console.error("Analyzer failed:", err);
    res.status(500).json({ error: "Failed to analyze contract" });
  }
});

app.listen(PORT, () => {
  console.log(`Analyzer server ready at http://localhost:${PORT}`);
  console.log(`FastAPI backend expected at ${FASTAPI_URL}`);
});

