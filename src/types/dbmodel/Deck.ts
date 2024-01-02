import BaseModel from "./BaseModel";

export default interface Deck extends BaseModel {
    readonly name: string
    readonly parentId: string | null
    readonly isShared: number // boolean stored as number in db 0 or 1
}