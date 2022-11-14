import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";

const participantsSchema = joi.object({
  name: joi.string().required(),
});
const messagesSchema = joi.object({
  from: joi.string().required(),
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.any().valid("message", "private_message").required(),
  time: joi.string().required(),
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
    .findOne({ name: name });

  if (jaExiste) return res.sendStatus(409);
  try {
    await db
      .collection("participants")
      .insertOne({ name, lastStatus: Date.now() });
    await db.collection("messages").insertOne({
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

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;

  try {
    const jaExiste = await db
      .collection("participants")
      .findOne({ name: user });
    if (!jaExiste) {
      res.status(422).send("Usuário não registrado");
      return;
    }

    const mensagem = {
      from: jaExiste.name,
      to: to,
      text: text,
      type: type,
      time: dayjs(Date.now()).format("HH:mm:ss"),
    };

    const { error } = messagesSchema.validate(mensagem, { abortEarly: false });
    if (error) {
      const errors = error.details.map((detail) => detail.message);
      res.send(errors);
      return;
    }

    await db.collection("messages").insertOne(mensagem);
    res.status(201).send({ message: "Mensagem enviada com sucesso" });

  } catch (error) {
    console.log(error);
  }
});

app.get("/messages", async (req, res) => {
  const limite = parseInt(req.query.limit);
  const { user } = req.headers;
  try{
    const encontraMensagemUnica = await db.collection("participants").findOne({name:user});
    if(!encontraMensagemUnica){
      res.status(422).send({message:"Usuário não registrado"})
      return
    }
    let encontraMensagem = await db.collection("messages").find().toArray();
    if(limite) {
      const LimitedMessages = [];
      for(let i = encontraMensagem.length - 1; i>=0; i--){
        if(LimitedMessages.length < limite){
          if(
            encontraMensagem[i].from === encontraMensagemUnica.name||
            encontraMensagem[i].to === "Todos" ||
            encontraMensagem[i].to === encontraMensagemUnica.name
          ){
            LimitedMessages.unshift(encontraMensagem[i])
          }
        }
      }
      encontraMensagem = LimitedMessages
    } else{
      encontraMensagem = encontraMensagem.filter((m,u) => {
        if(
          encontraMensagem[i].from === encontraMensagemUnica.name||
            encontraMensagem[i].to === "Todos" ||
            encontraMensagem[i].to === encontraMensagemUnica.name
        ){
          return true
        }else{
          return false
        }
      })
    }
    res.send(encontraMensagem);
  }catch(err){
    res.sendStatus(500);
  }


});

app.post("/status", async (req, res) => {
  const {user} = req.headers
    const participantes = await db.collection("participants").findOne({name:user})

  if(!participantes){
    res.sendStatus(404)
    return
  }

await db.collection("participants").updateOne({name:user},{$set:{lastStatus:Date.now()}})
.then(()=> res.sendStatus(200))
.catch((err)=>res.sendStatus(err))
});

setInterval(participantsUpdate, 15000)

function participantsUpdate() {
  const agora = Date.now();
  const participants = db.collection("participants")
  participants
      .find()
      .toArray()
      .then((p) => {
          p.forEach(element => {
              const tempoOffline = agora - element.lastStatus
              if (tempoOffline > 10000) {

                  participants.deleteOne({ name: element.name })
                  console.log("taoff", tempoOffline)
                  db.collection("messages").insertOne({
                    from: element.name,
                    to: "Todos",
                    text: "sai da sala",
                    type: "status",
                    time: dayjs(Date.now()).format("HH:mm:ss"),
                  })
              } else {
                  console.log("ta on", tempoOffline)
              }
          });


      })
      .catch(err => {
          console.log(err.status)
      }
      )
}


app.listen(process.env.PORT, () => {
  console.log(`Server running in port: ${process.env.PORT}`);
});
