import BaseModel from "./dbmodel/BaseModel";
import EntityStoreError from "../error/EntityStoreError";

export interface EntityStore<T extends BaseModel> {
    id: string

    getAll(clientId: string): Promise<[T[], EntityStoreError | null]>

    getAllBy(clientId: string, where: keyof T, value: string): Promise<[T[], EntityStoreError | null]>

    getById(clientId: string, id: string): Promise<[T | null, EntityStoreError | null]>

    add(clientId: string, entity: T): Promise<EntityStoreError | null>

    addAll(clientId: string, entities: T[]): Promise<EntityStoreError | null>

    update(clientId: string, entity: T): Promise<EntityStoreError | null>

    delete(clientId: string, id: string): Promise<EntityStoreError | null>

    get(clientId: string, where: keyof T, value: string): Promise<[T | null, EntityStoreError | null]>

    getSize(clientId: string): Promise<[number, EntityStoreError | null]>

    create(clientId: string, values: Omit<T, "clientId" |  "id">): Promise<[T | null, EntityStoreError | null]>

    has(clientId: string, id: string): Promise<boolean>


}