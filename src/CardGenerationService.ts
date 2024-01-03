import axios from "axios";
import {Card} from "./types/dbmodel/Card";
import {FieldContent} from "./types/dbmodel/FieldContent";
import {FieldEntityStore} from "./stores/FieldEntityStore";
import {app} from "./index";
import {logger} from "./logger";
import {Field} from "./types/dbmodel/Field";
import {generateModelId} from "./utils";

export default class CardGenerationService {

    static formatInputString(inputText: string): string {
        return inputText.replaceAll("\n", " ")
    }

    static async generateCards(clientId: string, cardTypeId: string, deckId: string, inputText: string, gptVersion: string, openAIKey: string, prompt: string):
        Promise<{ cards: Card[], fieldContents: FieldContent[] } | null> {

        try {
            const response = await axios.post("https://api.openai.com/v1/chat/completions", {
                model: gptVersion,
                messages: [{role: "user", content: this.formatInputString(inputText)}, {
                    role: "system",
                    content: prompt
                }],
            }, {
                headers: {
                    "Content-Type": "application/json", "Authorization": "Bearer " + openAIKey
                }
            })


            const [fields, error] = await app.stores.fields.getAllBy(clientId, "cardTypeId", cardTypeId)

            if (error) {
                logger.error("Failed to generate cards: ", error.message)
                return null
            }

            const json = JSON.parse(response.data.choices[0].message.content)

            const cards: Card[] = []
            const fieldContents: FieldContent[] = []

            let isValidCard = true


            for (const cardFieldContents of json) {
                isValidCard = true

                const card = {
                    clientId,
                    id: generateModelId(),
                    cardTypeId,
                    paused: 0,
                    learningState: 0,
                    dueAt: 0,
                    deckId,
                }
                for (let i = 0; i < fields.length; i++) {
                    const field = fields[i] as Field
                    const content = cardFieldContents[i] as string | undefined
                    if (!content) {
                        isValidCard = false
                        break;
                    }
                    fieldContents.push({
                        content,
                        fieldId: field.id,
                        id: generateModelId(),
                        cardId: card.id,
                        clientId
                    })
                }
                if (isValidCard) {
                    cards.push(card)
                }
            }

            if (cards.length === 0) {
                const client = await app.admin.auth().getUser(clientId)
                logger.error(`User(${client.email}) Failed to generate cards: No cards generated`)
                return null
            }

            if (fieldContents.length !== cards.length * fields.length) {
                const client = await app.admin.auth().getUser(clientId)
                logger.error(`User(${client.email}) Failed to generate cards: Field contents length does not match`)
                return null
            }

            return {cards, fieldContents}
        } catch (e) {
            const client = await app.admin.auth().getUser(clientId)
            logger.error(`User(${client.email}) Failed to generate cards: ${e}`)
            return null

        }


    }
}