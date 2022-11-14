import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";

const participantsSchema = joi.object({
  name: joi.string().required(),
});

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
try {
  await mongoClient.connect();
  console.log("Mongodb conectado!");
} catch (err) {
  console.log(err);
}

let db = mongoClient.db("UOL");

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const userName = req.body.name;

  const validation = participantsSchema.validate(req.body, {
    abortEarly: false,
  });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.send(errors);
    return;
  }
  const jaExiste = await mongoClient
  .db("UOL")
  .collection("participants")
  .findOne({ name: userName });
  
if (jaExiste) return res.sendStatus(409);
  try {
    
    await db
      .collection("participants")
      .insertOne({ name, lastStatus: Date.now() });
    await db
      .collection("messages")
      .insertOne({
        from: name,
        to: "Todos",
        text: "entra na sala...",
        type: "status",
        time: dayjs(Date.now()).format("HH:mm:ss"),
      });
    console.log(name);
    res.status(201).send("participante ok");
  } catch (err) {
    res.status(422).send(err);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const participantesEncontrados = await db
      .collection("participants")
      .find()
      .toArray();

    res.send(participantesEncontrados);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});
app.get("/messages", async (req, res) => {
  try {
    const mensagensEncontrados = await db
      .collection("messages")
      .find()
      .toArray();
      console.log(dayjs(Date.now()).format("HH:mm:ss"))

    res.send(mensagensEncontrados);
    const horario = dayjs();
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running in port: ${process.env.PORT}`);
});
