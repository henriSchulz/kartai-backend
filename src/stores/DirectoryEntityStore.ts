import {EntityStore} from "./abstract/EntityStore";
import {Directory} from "../types/dbmodel/Directory";
import {Database} from "sqlite3";
import {OmittedStoreSchema, StoreSchema} from "../types/StoreSchema";
import {ID_PROPERTIES} from "../utils";
import EntityStoreError from "../error/EntityStoreError";
import Deck from "../types/dbmodel/Deck";
import {app} from "../index";


export class DirectoryEntityStore extends EntityStore<Directory> {


    constructor(database: Database, callback?: () => void) {
        const directoryStoreSchema: OmittedStoreSchema<Directory> = {
            name: {type: "string", limit: 100},
            parentId: {type: "string", limit: ID_PROPERTIES.length, reference: "directories", nullable: true},
            isShared: {type: "number", limit: 1}
        }

        super("directories", directoryStoreSchema, database, 1000, callback);
    }

    public async getSubDirectories(clientId: string, directoryId: string): Promise<[Directory[], EntityStoreError | null]> {
        const dirs: Directory[] = []

        const [allDirs, err] = await this.getAll(clientId)

        if (err) return [[], err]

        const collectSubDirectories = (parentId: string) => {
            for (const dir of allDirs) {
                if (dir.parentId === parentId) {
                    dirs.push(dir);
                    collectSubDirectories(dir.id);
                }
            }
        };

        collectSubDirectories(directoryId);

        return [dirs, null]
    }


    public async getSubDecks(clientId: string, directoryId: string): Promise<[Deck[], EntityStoreError | null]> {
        const [decks, error] = await app.stores.decks.getAllBy(clientId, "parentId", directoryId)

        if (error) return [[], error]

        const [subDirectories, err] = await this.getSubDirectories(clientId, directoryId)

        if (err) return [[], err]

        for (const subDirectory of subDirectories) {
            const [subDecks, err] = await app.stores.decks.getAllBy(clientId, "parentId", subDirectory.id)
            if (err) return [[], err]
            decks.push(...subDecks)
        }
        return [decks, null]
    }
}