import {Database} from "sqlite3";
import express from "express";
import cors from "cors";
import Deck from "./types/dbmodel/Deck";
import DeckEntityStore from "./stores/DeckEntityStore";
import {
    getAllStoresEntitiesFunction,
    getBasicAddFunction,
    getBasicAllEntitiesFunction,
    getBasicDeleteFunction,
    getBasicUpdateFunction
} from "./routes/basicStoreRoutes";
import {EntityStore} from "./types/EntityStore";
import {logger} from "./logger";
import {DirectoryEntityStore} from "./stores/DirectoryEntityStore";
import {CardEntityStore} from "./stores/CardEntityStore";
import {CardType} from "./types/dbmodel/CardType";
import {Card} from "./types/dbmodel/Card";
import {Directory} from "./types/dbmodel/Directory";
import {FieldContent} from "./types/dbmodel/FieldContent";
import {Field} from "./types/dbmodel/Field";
import {CardTypeVariant} from "./types/dbmodel/CardTypeVariant";
import {CardTypeEntityStore} from "./stores/CardTypeEntityStore";
import {FieldEntityStore} from "./stores/FieldEntityStore";
import {FieldContentEntityStore} from "./stores/FieldContentEntityStore";
import {CardTypeVariantEntityStore} from "./stores/CardTypeVariantEntityStore";
import {deleteClient, getAuthMiddleware} from "./routes/authenticationRoutes";
import rateLimit from "express-rate-limit";
import https from "https";
import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import {SharedItem} from "./types/dbmodel/SharedItem";
import {SharedItemEntityStore} from "./stores/SharedItemEntityStore";
import {
    deleteBySharedItemId,
    getSharedItemDownload,
    loadAllSharedItems,
    transferSharedItem
} from "./routes/sharedItemRoutes";
import {extractTextFromImage, extractTextFromPDF, generateCards, importFromCraftTable} from "./routes/routes";
import fileUpload from "express-fileupload";


export type Stores = {
    directories: DirectoryEntityStore,

    decks: DeckEntityStore,

    cardTypes: CardTypeEntityStore,

    cards: CardEntityStore,

    fields: FieldEntityStore,

    fieldContents: FieldContentEntityStore,

    cardTypeVariants: CardTypeVariantEntityStore,

    sharedItems: SharedItemEntityStore

}

type Models = Directory | Deck | CardType | Card | Field | FieldContent | CardTypeVariant | SharedItem

export class Application {

    public readonly database: Database;
    private readonly app: express.Application;
    public readonly production: boolean = process.env.NODE_ENV === "production";
    private readonly port: number = process.env.PORT ? Number(process.env.PORT) : (this.production ? 443 : 4000)
    public readonly stores: Stores
    public readonly admin: admin.app.App


    constructor(database: Database, app: express.Application, admin: admin.app.App) {
        this.database = database;
        this.app = app;
        this.admin = admin
        this.stores = {} as Stores //initialize empty stores object to be filled later initializeStores()
    }


    private async initializeStores() {
        await new Promise<void>(resolve => this.stores["directories"] = new DirectoryEntityStore(this.database, () => resolve()))
        await new Promise<void>(resolve => this.stores["decks"] = new DeckEntityStore(this.database, () => resolve()))
        await new Promise<void>(resolve => this.stores["cardTypes"] = new CardTypeEntityStore(this.database, () => resolve()))
        await new Promise<void>(resolve => this.stores["cards"] = new CardEntityStore(this.database, () => resolve()))
        await new Promise<void>(resolve => this.stores["fields"] = new FieldEntityStore(this.database, () => resolve()))
        await new Promise<void>(resolve => this.stores["fieldContents"] = new FieldContentEntityStore(this.database, () => resolve()))
        await new Promise<void>(resolve => this.stores["cardTypeVariants"] = new CardTypeVariantEntityStore(this.database, () => resolve()))
        await new Promise<void>(resolve => this.stores["sharedItems"] = new SharedItemEntityStore(this.database, () => resolve()))
        logger.info("Initialized all stores")
    }

    private initializeBasicStoreRoutes() {
        for (const store of Object.values(this.stores)) {
            //responds with an array of all entities {"entities": []}
            if (store.id !== "sharedItems") this.app.get(`/${store.id}`, getBasicAllEntitiesFunction<Models>(store))
            //accepts an array of entities to add {"entities": []}
            this.app.post(`/${store.id}/add`, getAuthMiddleware(this.admin), getBasicAddFunction<Models>(store))
            //accepts an array of entities to update {"entities": []}
            this.app.post(`/${store.id}/update`, getAuthMiddleware(this.admin), getBasicUpdateFunction<Models>(store))
            //accepts an array of ids to delete {"ids": []}
            this.app.post(`/${store.id}/delete`, getAuthMiddleware(this.admin), getBasicDeleteFunction<Models>(store))
        }
        logger.info("Initialized all basic store routes")
    }

    private initializeRoutes() {
        this.app.get(`/${this.stores.sharedItems.id}/:id`, getSharedItemDownload)
        this.app.get("/all", getAuthMiddleware(this.admin), getAllStoresEntitiesFunction(this.stores))
        this.app.get(`/${this.stores.sharedItems.id}`, loadAllSharedItems)
        this.app.post(`/${this.stores.sharedItems.id}/transfer`, getAuthMiddleware(this.admin), transferSharedItem)
        this.app.post(`/${this.stores.sharedItems.id}/deleteBySharedItem`, getAuthMiddleware(this.admin), deleteBySharedItemId)
        this.app.delete("/deleteClient", getAuthMiddleware(this.admin), deleteClient)
        this.app.post("/cards/generate", getAuthMiddleware(this.admin), generateCards)
        this.app.post("/cards/import-from-craft", getAuthMiddleware(this.admin), importFromCraftTable)
        this.app.post("/files/extract-text-from-pdf", getAuthMiddleware(this.admin), extractTextFromPDF)
        this.app.post("/files/extract-text-from-image", getAuthMiddleware(this.admin), extractTextFromImage)
    }

    private initializeMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({extended: true}));
        this.app.use(cors({origin: "*"}));
        const limiter = rateLimit({
            windowMs: 1000,
            limit: 15,
            validate: {
                xForwardedForHeader: false
            }
        })
        this.app.use(limiter)
        this.app.use(fileUpload())
    }


    async start() {
        await new Promise<void>(resolve => this.database.run("PRAGMA foreign_keys = ON", () => resolve()))
        await this.initializeStores()
        this.initializeMiddleware()
        this.initializeBasicStoreRoutes()
        this.initializeRoutes()

        if (!this.production) {
            this.app.listen(this.port, () => {
                logger.info(`Listening on port ${this.port}`);
            });
        } else {
            const sslServer = https.createServer({
                key: fs.readFileSync(path.join(__dirname, "keys", "key.pem")),
                cert: fs.readFileSync(path.join(__dirname, "keys", "cert.pem")),
            }, this.app)

            sslServer.listen(this.port, () => {
                logger.info(`Listening on port ${this.port}.`);
            });
        }


    }

}


