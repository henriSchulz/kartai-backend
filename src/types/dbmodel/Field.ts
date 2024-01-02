import BaseModel from "./BaseModel";

export interface Field extends BaseModel {
    readonly name: string
    readonly cardTypeId: string
}