import {NextFunction, Request, Response} from "express";
import {DecodedIdToken} from "firebase-admin/lib/auth";
import Client from "../types/Client";
import {logger} from "../logger";
import admin from "firebase-admin";
import {app} from "../index";


declare global {
    namespace Express {
        interface Request {
            client?: Client;
        }
    }
}

async function getByToken(admin: admin.app.App, idToken: string): Promise<[Client | null, Error | null]> {
    try {
        const decodedToken: DecodedIdToken = await admin.auth().verifyIdToken(idToken, true)

        const googleUser = await admin.auth().getUser(decodedToken.uid)
        const client: Client = {
            id: googleUser.uid,
            userName: googleUser.displayName!,
            email: googleUser.email!,
            token: idToken
        }

        return [client, null]
    } catch (err: any) {
        return [null, err]
    }
}


export function getAuthMiddleware(admin: admin.app.App) {

    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authorization = req.header("Authorization");
            if (!authorization) {
                return res.sendStatus(401);
            }
            const token = authorization.split(" ")[1];
            if (!token) return res.sendStatus(401);

            const [client, error] = await getByToken(admin, token)

            if (!client) return res.sendStatus(401)
            if (error) {
                const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
                logger.error(`Unauthorized api request (Path: ${req.path}, IP: ${ip})`)
                return res.sendStatus(401);
            }

            req.client = client;
            next();
        } catch (err) {
            console.error(err);
            res.sendStatus(500);
        }
    }


}


export async function deleteClient(req: Request, res: Response) {
    const client = req.client!
    await app.admin.auth().deleteUser(client.id)
    for (const store of Object.values(app.stores)) {
        await new Promise<void>((resolve) => app.database.run(`DELETE
                                                               FROM ${store.id}
                                                               WHERE clientId = ?`, [client.id], (err) => err ? res.status(500).json({error: err.message}) : resolve()))
    }

    logger.info(`Client ${client.email} has been deleted`)
    return res.sendStatus(200)

}