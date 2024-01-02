import {EntityStore} from "./abstract/EntityStore";
import {SharedItem} from "../types/dbmodel/SharedItem";
import {Database} from "sqlite3";
import {OmittedStoreSchema} from "../types/StoreSchema";
import EntityStoreError from "../error/EntityStoreError";
import {app} from "../index";
import {CardType} from "../types/dbmodel/CardType";
import {Card} from "../types/dbmodel/Card";
import {CardTypeVariant} from "../types/dbmodel/CardTypeVariant";
import {FieldContent} from "../types/dbmodel/FieldContent";
import {Field} from "../types/dbmodel/Field";
import {generateModelId, ID_PROPERTIES} from "../utils";
import ImportExportObject from "../types/ImportExportObject";
import {Directory} from "../types/dbmodel/Directory";
import Deck from "../types/dbmodel/Deck";
import {DeckOrDirectory} from "../types/DeckOrDirectory";
import {CardTypeEntityStore} from "./CardTypeEntityStore";

export class SharedItemEntityStore extends EntityStore<SharedItem> {


    constructor(database: Database, callback?: () => void) {

        const storeSchema: OmittedStoreSchema<SharedItem> = {
            sharedItemId: {type: "string", limit: ID_PROPERTIES.length},
            sharedItemName: {type: "string", limit: 100},
            downloads: {type: "number", limit: 10e20}
        }

        super("sharedItems", storeSchema, database, 500, callback);
    }

    getAll(): Promise<[SharedItem[], EntityStoreError | null]> {
        return new Promise((resolve) => {
            this.database.all(`SELECT *
                               FROM ${this.id}`, (err, rows: SharedItem[]) => {
                if (err) {
                    resolve([[], new EntityStoreError(err.message, true)])
                } else {
                    resolve([rows, null])
                }
            })
        })
    }


    async getById(sharedItemId: string): Promise<[SharedItem | null, EntityStoreError | null]> {
        return new Promise((resolve) => {
            this.database.get(`SELECT *
                               FROM ${this.id}
                               WHERE id = ?`, [sharedItemId], (err, row: SharedItem) => {
                if (err) {
                    resolve([null, new EntityStoreError(err.message, true)])
                } else {
                    resolve([row, null])
                }
            })
        })
    }


    async getDownload(sharedItemId: string): Promise<[ImportExportObject | null, EntityStoreError | null]> {

        const stores = app.stores

        const itemsToExport: ImportExportObject = {
            directories: [] as Directory[],
            decks: [] as Deck[],
            cards: [] as Card[],
            cardTypes: [] as CardType[],
            fieldContents: [] as FieldContent[],
            fields: [] as Field[],
            cardTypeVariants: [] as CardTypeVariant[],
        }

        const [sharedItem, error] = await this.getById(sharedItemId)

        if (error || !sharedItem) return [null, error ?? new EntityStoreError("Shared item not found", false)]

        let deckOrDirectory: DeckOrDirectory | null = null


        if (await stores.decks.has(sharedItem.clientId, sharedItem.sharedItemId)) {
            const [deck, error] = await stores.decks.getById(sharedItem.clientId, sharedItem.sharedItemId)
            if (error || !deck) return [null, error ?? new EntityStoreError("Deck not found", false)]
            deckOrDirectory = {
                ...deck,
                isDirectory: false
            }
        } else {
            const [directory, error] = await stores.directories.getById(sharedItem.clientId, sharedItem.sharedItemId)
            if (error || !directory) return [null, error ?? new EntityStoreError("Directory not found", false)]
            deckOrDirectory = {
                ...directory,
                isDirectory: true
            }
        }
        if (deckOrDirectory.isDirectory) {
            const [subDirs, error] = await stores.directories.getSubDirectories(sharedItem.clientId, deckOrDirectory.id)
            if (error) return [null, error]
            itemsToExport.directories = [...subDirs, deckOrDirectory]
            const [decks, err] = await stores.decks.getAllBy(sharedItem.clientId, "parentId", deckOrDirectory.id)
            if (err) return [null, err]
            itemsToExport.decks.push(...decks)
            for (const deck of decks) {
                const [cards, _err] = await stores.cards.getAllBy(sharedItem.clientId, "deckId", deck.id)
                if (_err) return [null, _err]
                itemsToExport.cards.push(...cards)
                for (const card of cards) {
                    const [fieldContents, __err] = await stores.fieldContents.getAllBy(sharedItem.clientId, "cardId", card.id)
                    if (__err) return [null, __err]
                    itemsToExport.fieldContents.push(...fieldContents)
                    if (!itemsToExport.cardTypes.some(e => e.id === card.cardTypeId)) {
                        const [cardType, ___err] = await stores.cardTypes.getById(sharedItem.clientId, card.cardTypeId)
                        if (___err) return [null, ___err]
                        if (cardType) {
                            itemsToExport.cardTypes.push(cardType)
                            const [fields, ____err] = await stores.fields.getAllBy(sharedItem.clientId, "cardTypeId", cardType.id)
                            if (____err || !fields) return [null, ____err ?? new EntityStoreError("Fields not found", false)]
                            itemsToExport.fields.push(...fields)
                            const [cardTypeVariants, _____err] = await stores.cardTypeVariants.getAllBy(sharedItem.clientId, "cardTypeId", cardType.id)
                            if (_____err || !cardTypeVariants) return [null, _____err ?? new EntityStoreError("Card type variants not found", false)]
                            itemsToExport.cardTypeVariants.push(...cardTypeVariants)
                        }
                    }
                }
            }
            return [itemsToExport, null]
        } else {
            const [deck, err] = await stores.decks.getById(sharedItem.clientId, deckOrDirectory.id)
            if (err || !deck) return [null, err ?? new EntityStoreError("Deck not found", false)]
            itemsToExport.decks.push(deck)
            const [cards, _err] = await stores.cards.getAllBy(sharedItem.clientId, "deckId", deck.id)
            itemsToExport.cards.push(...cards)
            for (const card of cards) {
                const [fieldContents, __err] = await stores.fieldContents.getAllBy(sharedItem.clientId, "cardId", card.id)
                if (__err) return [null, __err]
                itemsToExport.fieldContents.push(...fieldContents)
                if (!itemsToExport.cardTypes.some(e => e.id === card.cardTypeId)) {
                    const [cardType, ___err] = await stores.cardTypes.getById(sharedItem.clientId, card.cardTypeId)
                    if (cardType) {
                        itemsToExport.cardTypes.push(cardType)
                        const [fields, ____err] = await stores.fields.getAllBy(sharedItem.clientId, "cardTypeId", cardType.id)
                        if (____err || !fields) return [null, ____err ?? new EntityStoreError("Fields not found", false)]
                        itemsToExport.fields.push(...fields)
                        const [cardTypeVariants, _____err] = await stores.cardTypeVariants.getAllBy(sharedItem.clientId, "cardTypeId", cardType.id)
                        if (_____err || !cardTypeVariants) return [null, _____err ?? new EntityStoreError("Card type variants not found", false)]
                        itemsToExport.cardTypeVariants.push(...cardTypeVariants)
                    }
                }
            }
            return [itemsToExport, null]
        }
    }

    async transferSharedItem(clientId: string, sharedItemId: string): Promise<EntityStoreError | null> {
        const [download, error] = await this.getDownload(sharedItemId)

        if (error) return error

        const [sharedItem, _error] = await this.getById(sharedItemId)

        if (_error || !sharedItem) return _error ?? new EntityStoreError("Shared item not found", false)

        const stores = app.stores

        const {
            directories,
            decks,
            cards,
            cardTypes,
            fieldContents,
            fields,
            cardTypeVariants,
        } = download as ImportExportObject


        const itemsToImport: ImportExportObject = {
            directories: [] as Directory[],
            decks: [] as Deck[],
            cards: [] as Card[],
            cardTypes: [] as CardType[],
            fieldContents: [] as FieldContent[],
            fields: [] as Field[],
            cardTypeVariants: [] as CardTypeVariant[],
        }

        const itemsToImportFinal = {
            cards: [] as Card[],
            fieldContents: [] as FieldContent[],
        }


        if (directories.length !== 0) {
            for (const directory of directories) {
                const newDirectoryId = generateModelId()
                itemsToImport.directories.push({...directory, id: newDirectoryId, clientId, isShared: 0})
                for (const deck of decks.filter(e => e.parentId === directory.id)) {
                    const newDeckId = generateModelId()
                    itemsToImport.decks.push({...deck, id: newDeckId, parentId: newDirectoryId, isShared: 0})
                    for (const card of cards.filter(e => e.deckId === deck.id)) {
                        const newCardId = generateModelId()
                        itemsToImport.cards.push({...card, id: newCardId, deckId: newDeckId})
                        for (const fieldContent of fieldContents.filter(e => e.cardId === card.id)) {
                            const newFieldContentId = generateModelId()
                            itemsToImport.fieldContents.push({
                                ...fieldContent,
                                id: newFieldContentId,
                                cardId: newCardId
                            })
                        }
                    }
                }
            }
        } else {
            for (const deck of decks) {
                const newDeckId = generateModelId()
                itemsToImport.decks.push({...deck, id: newDeckId, parentId: null, isShared: 0})
                for (const card of cards.filter(e => e.deckId === deck.id)) {
                    const newCardId = generateModelId()
                    itemsToImport.cards.push({
                        ...card,
                        id: newCardId,
                        dueAt: 0,
                        deckId: newDeckId,
                        paused: 0,
                    })
                    for (const fieldContent of fieldContents.filter(e => e.cardId === card.id)) {
                        const newFieldContentId = generateModelId()
                        itemsToImport.fieldContents.push({
                            ...fieldContent,
                            id: newFieldContentId,
                            cardId: newCardId
                        })
                    }
                }
            }
        }

        for (const cardType of cardTypes) {
            let newCardTypeName = null
            for (const prefix of CardTypeEntityStore.DEFAULT_CARD_TYPE_PREFIXES) {
                if (cardType.id.startsWith(prefix)) {
                    newCardTypeName = cardType.name + ` (${sharedItem.clientId.slice(0, 8)})`
                }
            }

            const newCardTypeId = generateModelId()
            itemsToImport.cardTypes.push({...cardType, id: newCardTypeId, name: newCardTypeName ?? cardType.name})

            for (const card of itemsToImport.cards.filter(e => e.cardTypeId === cardType.id)) {
                const updatedCard = {
                    ...card,
                    cardTypeId: newCardTypeId
                }
                itemsToImportFinal.cards.push(updatedCard)
            }

            for (const field of fields.filter(e => e.cardTypeId === cardType.id)) {
                const newFieldId = generateModelId()
                itemsToImport.fields.push({...field, id: newFieldId, cardTypeId: newCardTypeId})
                for (const fieldContent of itemsToImport.fieldContents.filter(e => e.fieldId === field.id)) {
                    const updatedFieldContent = {
                        ...fieldContent,
                        fieldId: newFieldId
                    }
                    itemsToImportFinal.fieldContents.push(updatedFieldContent)
                }

            }
            for (const cardTypeVariant of cardTypeVariants.filter(e => e.cardTypeId === cardType.id)) {
                const newCardTypeVariantId = generateModelId()
                itemsToImport.cardTypeVariants.push({
                    ...cardTypeVariant,
                    id: newCardTypeVariantId,
                    cardTypeId: newCardTypeId
                })
            }
        }

        let err = await stores.directories.addAll(clientId, itemsToImport.directories)
        if (err) return err
        err = await stores.decks.addAll(clientId, itemsToImport.decks)
        if (err) return err
        err = await stores.cardTypes.addAll(clientId, itemsToImport.cardTypes)
        if (err) return err
        err = await stores.fields.addAll(clientId, itemsToImport.fields)
        if (err) return err
        err = await stores.cards.addAll(clientId, itemsToImportFinal.cards)
        if (err) return err
        err = await stores.fieldContents.addAll(clientId, itemsToImportFinal.fieldContents)
        if (err) return err
        err = await stores.cardTypeVariants.addAll(clientId, itemsToImport.cardTypeVariants)
        if (err) return err


        err = await this.update(sharedItem.clientId, {
            ...sharedItem,
            downloads: sharedItem.downloads + 1
        })

        if (err) return err

        return null
    }

    async deleteBySharedItemId(sharedItemId: string): Promise<EntityStoreError | null> {
        return new Promise((resolve) => {
            this.database.run(`DELETE FROM ${this.id}
                               WHERE sharedItemId = ?`, [sharedItemId], (err) => {
                if (err) {
                    resolve(new EntityStoreError(err.message, true))
                } else {
                    resolve(null)
                }
            })
        })
    }
}