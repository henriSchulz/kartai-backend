import {DbDataType} from "./DbDataType";

export interface StoreSchemaObject {
    type: DbDataType //type of data in the stores

    limit: number //text length or number size

    reference?: string //reference to another stores

    required?: boolean //if the value is required

    nullable?: boolean //if the value can be null
}