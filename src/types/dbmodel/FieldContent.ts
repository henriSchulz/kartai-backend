import BaseModel from "./BaseModel";

export interface FieldContent extends BaseModel {
    fieldId: string
    cardId: string
    content: string
}