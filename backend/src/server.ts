import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { useSocketMiddleware } from "./socket";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.get("/api/test", (req: Request, res: Response) => {
  res.json({ message: "Hello from TypeScript Express!" });
});

const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

useSocketMiddleware(server);
