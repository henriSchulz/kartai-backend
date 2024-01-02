import Deck from "./dbmodel/Deck";
import {StoreSchemaObject} from "./StoreSchemaObject";
import BaseModel from "./dbmodel/BaseModel";


//omit the basel model fields from the store schema


export type OmittedStoreSchema<T extends BaseModel> = Record<keyof (Omit<T, "id" |  "clientId">), StoreSchemaObject>


export type StoreSchema<T extends BaseModel> = Record<keyof T, StoreSchemaObject>