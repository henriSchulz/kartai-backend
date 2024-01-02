import {DbDataType} from "../../types/DbDataType";

export const DB_DATATYPE_MAP: Record<DbDataType, string> = {

    "string": "VARCHAR",
    "number": "INTEGER",
    "null": "NULL",

}