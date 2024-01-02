import {Database} from "sqlite3";
import {EntityStore} from "./abstract/EntityStore";
import Deck from "../types/dbmodel/Deck";
import {StoreSchemaObject} from "../types/StoreSchemaObject";
import {OmittedStoreSchema, StoreSchema} from "../types/StoreSchema";
import {ID_PROPERTIES} from "../utils";

export default class DeckEntityStore extends EntityStore<Deck> {

    constructor(database: Database, callback?: () => void) {
        const storeSchema: OmittedStoreSchema<Deck> = {
            name: {type: "string", limit: 100},
            parentId: {type: "string", limit: ID_PROPERTIES.length, reference: "directories", nullable: true},
            isShared: {type: "number", limit: 1}
        }

        super("decks", storeSchema, database, 1000, callback);
    }


}