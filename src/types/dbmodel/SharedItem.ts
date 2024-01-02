import BaseModel from "./BaseModel";

export interface SharedItem extends BaseModel {
    sharedItemId: string
    sharedItemName: string
    downloads: number
}

