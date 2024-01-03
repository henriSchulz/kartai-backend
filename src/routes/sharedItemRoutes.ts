import express from "express";
import {app} from "../index";
import {logger} from "../logger";

export async function getSharedItemDownload(req: express.Request, res: express.Response) {
    const id = req.params["id"]

    if (!id) return res.status(422).json({error: "Invalid request params"})

    const [downloadData, error] = await app.stores.sharedItems.getDownload(id)

    if (error) {
        logger.error(error)
        if (!error.serverError) {
            return res.status(422).json({error: error.message})
        }
        return res.sendStatus(500)
    }

    res.json({download: downloadData})
}


export async function loadAllSharedItems(req: express.Request, res: express.Response) {
    const [sharedItems, error] = await app.stores.sharedItems.getAll()

    if (error) {
        logger.error(error)
        if (!error.serverError) {
            return res.status(422).json({error: error.message})
        }
        return res.sendStatus(500)
    }

    res.json({entities: sharedItems})
}

export async function transferSharedItem(req: express.Request, res: express.Response) {

    const client = req.client!

    if (!req.body) return res.status(422).json({error: "Invalid request body"})

    const id = req.body["id"]

    if (!id) return res.status(422).json({error: "Invalid request body"})

    const error = await app.stores.sharedItems.transferSharedItem(client.id, id)

    if (error) {
        logger.error(error)
        if (!error.serverError) {
            return res.status(422).json({error: error.message})
        }
        return res.sendStatus(500)
    }

    logger.info(`User(${client.email}) transferred a shared item ${id}`)
    res.sendStatus(200)
}

export async function deleteBySharedItemId(req: express.Request, res: express.Response) {
    const ids = req.body["id"] as string[]

    if (!ids || !Array.isArray(ids)) return res.status(422).json({error: "Invalid request params"})

    for (const id of ids) {
        const error = await app.stores.sharedItems.deleteBySharedItemId(id)

        if (error) {
            logger.error(error)
            if (!error.serverError) {
                return res.status(422).json({error: error.message})
            }
            return res.sendStatus(500)
        }
    }

    res.sendStatus(200)
}