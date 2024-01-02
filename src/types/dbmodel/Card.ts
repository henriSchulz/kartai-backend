import BaseModel from "./BaseModel";

export  interface Card extends BaseModel {
    readonly cardTypeId: string
    readonly deckId: string
    readonly dueAt: number
    readonly paused: number // boolean stored as number in db 0 or 1
    readonly learningState: number

}