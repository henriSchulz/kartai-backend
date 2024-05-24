import BaseModel from "../types/dbmodel/BaseModel";
import {EntityStore} from "../types/EntityStore";
import express from "express";
import {logger} from "../logger";
import {Stores} from "../Application";


export function getBasicAllEntitiesFunction<T extends BaseModel>(store: EntityStore<T>) {
    return async (req: express.Request, res: express.Response) => {
        const client = req.client!
        try {
            const [entities, error] = await store.getAll(client.id);

            if (error) {
                if (error.serverError) logger.error(error)
                res.status(error.serverError ? 500 : 422).json({error: error.message})
            }

            res.status(200).json({entities: entities});
            // logger.info(`User(${client.email}) fetched all ${store.id}`)
        } catch (e: any) {
            logger.error(e.message)
            res.status(500).json({error: e.message});
        }
    }
}

export function getBasicDeleteFunction<T extends BaseModel>(store: EntityStore<T>) {
    return async (req: express.Request, res: express.Response) => {
        const client = req.client!
        try {
            if (!req.body) return res.status(422).json({error: "Invalid request Body. Property 'ids' is missing"})

            const ids = req.body["ids"];
            if (!Array.isArray(ids)) return res.status(422).json({error: "Invalid request Body. Property 'ids' is not an array"})

            for (const id of ids) {
                const error = await store.delete(client.id, id);
                if (error) {
                    if (error.serverError) logger.error(error)
                    return res.status(error.serverError ? 500 : 422).json({error: error.message})

                }
            }
            res.sendStatus(200);
            logger.info(`User(${client.email}) deleted ${ids.length} ${store.id}`)
        } catch (e: any) {
            logger.error(e.message)
            res.status(500).json({error: e.message});
        }
    }
}

export function getBasicUpdateFunction<T extends BaseModel>(store: EntityStore<T>) {
    return async (req: express.Request, res: express.Response) => {
        const client = req.client!
        try {
            const entities = req.body["entities"];
            if (!Array.isArray(entities)) return res.status(422).json({error: `Invalid request Body. Object 'entities' is not typeof ${store.id}[]`})

            for (const entity of entities) {
                const error = await store.update(client.id, entity);
                if (error) {
                    if (error.serverError) logger.error(error)
                    return res.status(error.serverError ? 500 : 422).json({error: error.message})
                }
            }
            res.sendStatus(200);
            logger.info(`User(${client.email}) updated ${entities.length} ${store.id}`)
        } catch (e: any) {
            logger.error(e.message)
            res.status(500).json({error: e.message});
        }
    }
}

export function getBasicAddFunction<T extends BaseModel>(store: EntityStore<T>) {
    return async (req: express.Request, res: express.Response) => {
        const client = req.client!
        try {
            const entities = req.body["entities"];
            if (!Array.isArray(entities)) return res.status(422).json({error: `Invalid request Body. Object 'entities' is not typeof ${store.id}[]`})
            for (const entity of entities) {
                const error = await store.add(client.id, entity);
                if (error) {
                    if (error.serverError) logger.error(error.message + ` (in ${store.id}.add())`)
                    return res.status(error.serverError ? 500 : 422).json({error: error.message})
                }
            }
            res.sendStatus(200);
            logger.info(`User(${client.email}) added ${entities.length} ${store.id}`)
        } catch (e: any) {
            logger.error(e.message)
            res.status(500).json({error: e.message});
        }
    }
}


export function getAllStoresEntitiesFunction(stores: Stores) {
    return async (req: express.Request, res: express.Response) => {
        const client = req.client!

        const allEntities: Record<string, any> = {}

        const storesValues = Object.values(stores)

        for (const storesValue of storesValues) {
            const [entities, error] = await storesValue.getAll(client.id)
            if (error) {
                logger.error(error)
                return res.sendStatus(500)
            }
            allEntities[storesValue.id] = entities
        }
        res.status(200).json(allEntities)
    }
}