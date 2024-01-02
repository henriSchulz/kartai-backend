import BaseModel from "./BaseModel";

export interface Directory extends BaseModel {
    readonly name: string
    readonly parentId: string | null
    readonly isShared: number // boolean stored as number in db 0 or 1

}