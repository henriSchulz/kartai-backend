import BaseModel from "./dbmodel/BaseModel";


export default interface Client extends Omit<BaseModel, "clientId"> {
    readonly userName: string
    readonly token: string
    readonly email: string
}