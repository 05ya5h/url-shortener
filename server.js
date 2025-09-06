import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./urls.js";

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// POST shorten
app.post("/shorten", async (req, res) => {
  const { longUrl } = req.body;
  const shortId = Math.random().toString(36).substring(7);

  try {
    await pool.query(
      "INSERT INTO urls (long_url, short_id) VALUES ($1, $2)",
      [longUrl, shortId]
    );

    res.json({ shortUrl: `${process.env.BASE_URL}/${shortId}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error shortening URL" });
  }
});

// Redirect
app.get("/:shortId", async (req, res) => {
  const { shortId } = req.params;
  try {
    const result = await pool.query(
      "SELECT long_url FROM urls WHERE short_id = $1",
      [shortId]
    );
    if (result.rows.length > 0) {
      res.redirect(result.rows[0].long_url);
    } else {
      res.status(404).send("URL not found!");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error!");
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log(`🚀 Server running on port ${process.env.PORT || 3000}`)
);
