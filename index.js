import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
try {
  await mongoClient.connect();
  console.log("MongoDB Conectado! ");
} catch (err) {
  console.log(err);
}

let db = mongoClient.db("UOL");

app.listen(process.env.PORT, () => {
  console.log(`Server running in port: ${process.env.PORT}`);
});
