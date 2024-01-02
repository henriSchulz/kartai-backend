import {EntityStore} from "./abstract/EntityStore";
import {CardType} from "../types/dbmodel/CardType";
import {Database} from "sqlite3";
import {OmittedStoreSchema} from "../types/StoreSchema";

export class CardTypeEntityStore extends EntityStore<CardType> {


    public static DEFAULT_CARD_TYPE_PREFIXES = ["dct1"]

    constructor(database: Database, callback?: () => void) {
        const storeSchema: OmittedStoreSchema<CardType> = {
            name: {type: "string", limit: 100},
        }

        super("cardTypes", storeSchema, database, 500, callback);
    }

}