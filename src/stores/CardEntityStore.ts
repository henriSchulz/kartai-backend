import {EntityStore} from "./abstract/EntityStore";
import {Card} from "../types/dbmodel/Card";
import {Database} from "sqlite3";
import {OmittedStoreSchema, StoreSchema} from "../types/StoreSchema";
import {ID_PROPERTIES} from "../utils";

export class CardEntityStore extends EntityStore<Card> {
    constructor(database: Database, callback?: () => void) {
        const storeSchema: OmittedStoreSchema<Card> = {
            deckId: {type: "string", limit: ID_PROPERTIES.length, reference: "decks"},
            cardTypeId: {type: "string", limit: ID_PROPERTIES.length, reference: "cardTypes"},
            dueAt: {type: "number", limit: 10e20},
            learningState: {type: "number", limit: 10e20},
            paused: {type: "number", limit: 1}
        }


        super("cards", storeSchema, database, 20000, callback);
    }
}