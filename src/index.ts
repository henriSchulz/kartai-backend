import express from "express";
import sqlite3 from "sqlite3";
import {Application} from "./Application";
import admin from "firebase-admin";


export const app = new Application(
    new sqlite3.Database(`${__dirname}/data/fc_data.db`),
    express(),
    admin.initializeApp({
        credential: admin.credential.cert(
            require("./keys/kartai-v2-firebase-adminsdk-p1b9o-402f4bd74c.json")
        )
    })
)


app.start()


