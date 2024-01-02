import {DbDataType} from "../../types/DbDataType";
import {Database} from "sqlite3";
import BaseModel from "../../types/dbmodel/BaseModel";
import {StoreSchemaObject} from "../../types/StoreSchemaObject";
import {DB_DATATYPE_MAP} from "./DbDataTypeMap";
import EntityStoreError from "../../error/EntityStoreError";
import {logger} from "../../logger";
import {OmittedStoreSchema, StoreSchema} from "../../types/StoreSchema";
import {generateModelId, ID_PROPERTIES} from "../../utils";


export abstract class EntityStore<T extends BaseModel> implements EntityStore<T> {

    public readonly id: string

    protected readonly storeSchema: StoreSchema<T>

    protected readonly database: Database

    protected readonly maxClientSize: number

    protected constructor(id: string, storeSchema: OmittedStoreSchema<T>, database: Database, maxClientSize: number, callback?: () => void) {
        this.id = id
        this.storeSchema = {
            id: {type: "string", limit: ID_PROPERTIES.length},
            clientId: {type: "string", limit: ID_PROPERTIES.length},
            ...storeSchema
        } as Record<keyof T, StoreSchemaObject>
        this.database = database
        this.maxClientSize = maxClientSize

        const freightKeys = Object.entries(this.storeSchema).filter(([key, value]) => value.reference).map(([key, value]) => {
            return `FOREIGN KEY (${key}) REFERENCES ${value.reference} (id) ON DELETE CASCADE`
        })

        const basicCreateTableStatement = `CREATE TABLE IF NOT EXISTS ${this.id}`


        const basicTableStructure = Object.entries(this.storeSchema).map(([key, value]) => {
            if (key === "id") {
                return `${key} ${DB_DATATYPE_MAP[value.type]} PRIMARY KEY NOT NULL`
            }

            if (value.type === "string") return `${key} ${DB_DATATYPE_MAP[value.type]}(${value.limit}) ${!value.nullable ? "NOT NULL" : ""}`

            return `${key} ${DB_DATATYPE_MAP[value.type]} ${!value.nullable ? "NOT NULL" : "NULL"}`

        })
        const fullCreateTableStatement = `${basicCreateTableStatement} ( ${[...basicTableStructure, ...freightKeys].join(", ")} )`
        this.database.run(fullCreateTableStatement, (err) => {
            if (err) {
                logger.error(`Failed to create table ${this.id}. Reason: ${err.message}`)
            }
            if (callback) callback()
        })
    }


    private isValidEntity(entity: T): { valid: boolean, reason: string | null } {
        for (const [key, value] of Object.entries(this.storeSchema)) {
            const entityValue = entity[key as keyof T]

            if (key === "clientId") continue

            if (entityValue === undefined || entityValue === null) {
                if (value.nullable) continue
                return {valid: false, reason: `Value for ${key} is undefined`}
            }

            if (typeof entityValue !== value.type) {
                return {
                    valid: false,
                    reason: `Value for ${key} is type of ${typeof entityValue} but should be type of ${value.type}`
                }
            }

            if (typeof entityValue === "string") {
                if (entityValue.length > value.limit) {
                    return {valid: false, reason: `Value for ${key} is too long. Max length is ${value.limit}`}
                }
            }

            if (typeof entityValue === "number") {
                if (entityValue < 0) {
                    return {valid: false, reason: `Value for ${key} is negative`}
                }

                if (entityValue > value.limit) {
                    return {valid: false, reason: `Value for ${key} is too large. Max value is ${value.limit}`}
                }
            }

        }


        return {valid: true, reason: null}
    }


    async addAll(clientId: string, entities: T[]): Promise<EntityStoreError | null> {
        for (const entity of entities) {
            const error = await this.add(clientId, entity)
            if (error) return error
        }

        return null
    }

    async add(clientId: string, entity: T): Promise<EntityStoreError | null> {

        const modifiedEntity = {
            ...entity,
            clientId,
        }

        const validEntity = this.isValidEntity(entity)
        if (!validEntity.valid) {
            return Promise.resolve(new EntityStoreError(`Invalid entity in ${this.id}.add(). Reason: ${validEntity.reason}`, false))
        }

        const [currentStoreClientSize, error] = await this.getSize(clientId)

        if (error) {
            return error
        }

        if (currentStoreClientSize >= this.maxClientSize) {
            return new EntityStoreError(`The maximum number of entities (${this.maxClientSize}) in ${this.id} has been reached (Client: ${clientId})`, false)
        }

        return await new Promise((resolve) => {

            const statement = `INSERT INTO ${this.id} (${Object.keys(this.storeSchema).join(", ")})
                               VALUES (${Object.keys(this.storeSchema).map(() => "?").join(", ")})`


            this.database.run(statement, [...Object.keys(this.storeSchema).map(key => modifiedEntity[key as keyof T])], (err) => {
                if (err) {

                    resolve(new EntityStoreError(err.message, true))
                } else {
                    resolve(null)
                }
            })
        })
    }

    getAll(clientId: string): Promise<[T[], EntityStoreError | null]> {
        return new Promise((resolve) => {
            this.database.all(`SELECT *
                               FROM ${this.id}
                               WHERE clientId = ?`, [clientId], (err, rows: T[]) => {
                if (err) {
                    resolve([[], new EntityStoreError(err.message, true)])
                } else {
                    resolve([rows, null])
                }
            })
        })
    }

    getAllBy(clientId: string, where: keyof T, value: string): Promise<[T[], EntityStoreError | null]> {
        return new Promise((resolve) => {
            this.database.all(`SELECT *
                               FROM ${this.id}
                               WHERE ${String(where)} = ?
                                 AND clientId = ?`, [value, clientId], (err, rows: T[]) => {
                if (err) {
                    resolve([[], new EntityStoreError(err.message, true)])
                } else {
                    resolve([rows, null])
                }
            })
        })
    }

    getById(clientId: string, id: string): Promise<[T | null, EntityStoreError | null]> {
        return this.get(clientId, "id", id)
    }

    get(clientId: string, where: keyof T, id: string): Promise<[T | null, EntityStoreError | null]> {
        return new Promise((resolve) => {
            this.database.get(`SELECT *
                               FROM ${this.id}
                               WHERE ${String(where)} = ?
                                 AND clientId = ?`, [id, clientId], (err, row: T) => {
                if (err) {
                    resolve([null, new EntityStoreError(err.message, true)])
                } else {
                    resolve([row, null])
                }
            })
        })
    }


    getSize(clientId: string): Promise<[number, EntityStoreError | null]> {
        return new Promise((resolve) => {
            this.database.get(`SELECT COUNT(*) as count
                               FROM ${this.id}
                               WHERE clientId = ?`, [clientId], (err, row: any) => {
                if (err) {
                    resolve([0, new EntityStoreError(err.message, true)])
                } else {
                    resolve([row.count || 0, null])
                }
            })
        })
    }

    update(clientId: string, entity: T): Promise<EntityStoreError | null> {

        let modifiedEntity = {
            ...entity,
            clientId,
        }

        const {id: __, clientId: ___, ...storeSchemaWithOutIdAndClientId} = this.storeSchema

        const validEntity = this.isValidEntity(entity)
        if (!validEntity.valid) {
            return Promise.resolve(new EntityStoreError(`Invalid entity in ${this.id}.update(). Reason: ${validEntity.reason}`, false))
        }

        return new Promise((resolve) => {
            const statement = `UPDATE ${this.id}
                               SET ${Object.keys(storeSchemaWithOutIdAndClientId).map(key => `${key} = ?`).join(", ")}
                               WHERE clientId = ?
                                 AND id = ?`
            this.database.run(statement, [...Object.keys(storeSchemaWithOutIdAndClientId).map(key => modifiedEntity[key as keyof T]), clientId, modifiedEntity.id], (err) => {
                if (err) {
                    resolve(new EntityStoreError(err.message, true))
                } else {
                    resolve(null)
                }
            })
        })
    }

    delete(clientId: string, id: string): Promise<EntityStoreError | null> {
        return new Promise((resolve) => {
            this.database.run(`DELETE
                               FROM ${this.id}
                               WHERE clientId = ?
                                 AND id = ?`, [clientId, id], (err) => {
                if (err) {
                    resolve(new EntityStoreError(err.message, true))
                } else {
                    resolve(null)
                }
            })
        })
    }

    async create(clientId: string, values: Omit<T, "clientId" | "id">): Promise<[T | null, EntityStoreError | null]> {
        const entity = {
            ...values,
            id: generateModelId(),
            clientId
        } as T

        const error = await this.add(clientId, entity)

        if (error) {
            return [null, error]
        }

        return [entity, null]
    }


    async has(clientId: string, id: string): Promise<boolean> {
        const [entity, error] = await this.getById(clientId, id)
        return !!entity
    }
}