import {EntityStore} from "./abstract/EntityStore";
import {CardTypeVariant} from "../types/dbmodel/CardTypeVariant";
import {OmittedStoreSchema} from "../types/StoreSchema";
import {Database} from "sqlite3";
import {ID_PROPERTIES} from "../utils";

export class CardTypeVariantEntityStore extends EntityStore<CardTypeVariant> {

    constructor(database: Database, callback?: () => void) {
        const storeSchema: OmittedStoreSchema<CardTypeVariant> = {
            templateFront: {type: "string", limit: 10000},
            templateBack: {type: "string", limit: 10000},
            cardTypeId: {type: "string", limit: ID_PROPERTIES.length, reference: "cardTypes"},
            name: {type: "string", limit: 100},
        }

        super("cardTypeVariants", storeSchema, database, 3000, callback);
    }


}