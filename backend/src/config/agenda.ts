import { MongoBackend } from "@agendajs/mongo-backend";
import { Agenda } from "agenda";
import mongoose from "mongoose";

let agenda: Agenda | null = null;

export const getAgenda = () => {
  if (!agenda) {
    if (!mongoose.connection.db) {
      throw new Error("Mongoose connection not established. Cannot initialize Agenda.");
    }

    const backend = new MongoBackend({
      mongo: mongoose.connection.db as any,
    });

    agenda = new Agenda({
      backend: backend,
    });
  }
  return agenda;
};

export const startAgenda = async () => {
  const instance = getAgenda();
  await instance.start();
  console.log("Agenda started successfully.");
};

export const stopAgenda = async () => {
  if (agenda) {
    await agenda.stop();
    console.log("Agenda stopped successfully.");
  }
};
