import {EntityStore} from "./abstract/EntityStore";
import {Field} from "../types/dbmodel/Field";
import {Database} from "sqlite3";
import {OmittedStoreSchema} from "../types/StoreSchema";
import {ID_PROPERTIES} from "../utils";

export class FieldEntityStore extends EntityStore<Field> {

    constructor(database: Database, callback?: () => void) {
        const storeSchema: OmittedStoreSchema<Field> = {
            name: {type: "string", limit: 100},
            cardTypeId: {type: "string", limit: ID_PROPERTIES.length, reference: "cardTypes"},
        }

        super("fields", storeSchema, database, 3000, callback);
    }
}