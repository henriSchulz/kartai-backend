import {EntityStore} from "./abstract/EntityStore";
import {FieldContent} from "../types/dbmodel/FieldContent";
import {Database} from "sqlite3";
import {OmittedStoreSchema} from "../types/StoreSchema";
import {ID_PROPERTIES} from "../utils";

export class FieldContentEntityStore extends EntityStore<FieldContent> {


    constructor(database: Database, callback?: () => void) {
        const storeSchema: OmittedStoreSchema<FieldContent> = {
            cardId: {type: "string", limit: ID_PROPERTIES.length, reference: "cards"},
            fieldId: {type: "string", limit: ID_PROPERTIES.length, reference: "fields"},
            content: {type: "string", limit: 5000},
        }


        super("fieldContents", storeSchema, database, 120000, callback);

    }


}