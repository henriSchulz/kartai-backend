import express from "express";
import CardGenerationService from "../CardGenerationService";
import pdfParse from "pdf-parse"
import {UploadedFile} from "express-fileupload";
import tesseract from "tesseract.js"
import {Card} from "../types/dbmodel/Card";
import {FieldContent} from "../types/dbmodel/FieldContent";
import {app} from "../index";
import puppeteer from "puppeteer";
import {chunkSubstr} from "../utils";
import {logger} from "../logger";

export async function extractTextFromPDF(req: express.Request, res: express.Response) {
    if (!req.files) return res.status(422).json({error: "No file uploaded"})
    const file = req.files["file"] as UploadedFile
    if (!file) return res.status(422).json({error: "No file uploaded"})

    if (file.size > 100 * 1024 * 1024) return res.status(422).json({error: "File too big (Max. 100MB)"})

    const pdf = await pdfParse(file.data)

    res.json({text: pdf.text})
}

export async function extractTextFromImage(req: express.Request, res: express.Response) {
    if (!req.files) return res.status(422).json({error: "No file uploaded"})
    const file = req.files["file"] as UploadedFile
    if (!file) return res.status(422).json({error: "No file uploaded"})

    if (file.size > 100 * 1024 * 1024) return res.status(422).json({error: "File too big (Max. 100MB)"})


    const text = (await tesseract.recognize(file.data)).data.text

    res.json({text})

}


export async function generateCards(req: express.Request, res: express.Response) {
    const client = req.client!

    if (!req.body) return res.status(422).json({error: "No body provided"})

    const {cardTypeId, inputText, prompt, openAIKey, gptVersion, deckId} = req.body as {
        cardTypeId: string
        prompt: string
        deckId: string
        inputText: string
        openAIKey: string
        gptVersion: string
    }

    if (!cardTypeId) return res.status(422).json({error: "No cardTypeId provided"})
    if (!inputText) return res.status(422).json({error: "No inputText provided"})
    if (!prompt) return res.status(422).json({error: "No prompt provided"})
    if (!openAIKey) return res.status(422).json({error: "No openAIKey provided"})
    if (!gptVersion) return res.status(422).json({error: "No gptVersion provided"})
    if (!deckId) return res.status(422).json({error: "No deckId provided"})


    const cards: Card[] = []
    const fieldContents: FieldContent[] = []


    let chunks: string[] = chunkSubstr(inputText, 2000)
    for (const chunk of chunks) {
        logger.info(`User(${client.email}) sending chunk to OpenAI API`)
        const result = await CardGenerationService.generateCards(client.id, cardTypeId, deckId, inputText, gptVersion, openAIKey, prompt)

        if (!result) return res.json({error: "Failed to generate cards"})

        const {cards: generatedCards, fieldContents: generatedFieldContents} = result
        cards.push(...generatedCards)
        fieldContents.push(...generatedFieldContents)
    }


    res.json({cards, fieldContents})
}

export async function importFromCraftTable(req: express.Request, res: express.Response) {
    const client = req.client!

    if (!req.body) return res.status(422).json({error: "No body provided"})

    const {craftUrl, numOfColumns} = req.body as {
        craftUrl: string
        numOfColumns: number
    }

    if (!craftUrl) return res.status(422).json({error: "No craftUrl provided"})
    if (!numOfColumns) return res.status(422).json({error: "No numOfColumns provided"})

    let contentList: string[] | null = []

    if (!app.production) {
        try {
            const browser = await puppeteer.launch({headless: true});
            const page = await browser.newPage();
            await page.goto(craftUrl, {waitUntil: "load"});

            contentList = (await page.evaluate(() => {
                const els = Array.from(document.body.querySelectorAll("div"));


                const documentBodyDiv = els.find(el => el.getAttribute("data-page-section") === "page-body-div")
                // .filter(el => el.children.length > 1)

                if (!documentBodyDiv) return null

                const table = Array.from(documentBodyDiv.children).find(el => el.classList.contains("sc-giadOv"))

                if (!table) return null

                const tableContent = Array.from(table.querySelectorAll("div")).find(el => el.classList.contains("sc-bAeIUo"))


                if (!tableContent) return null


                return Array.from(tableContent.children).map(el => el.textContent || '')
            }) as string[])
            if (contentList) contentList = contentList.filter(el => el.length > 0)
        } catch (e) {
            return res.json({error: "Failed to parse table"})
        }
    } else {
        try {
            const browser = await puppeteer.launch({
                //headless: false,
                // executablePath: '/usr/bin/chromium-browser',
                args: ['--disable-setuid-sandbox', '--no-sandbox']
            });
            const page = await browser.newPage();
            await page.goto(craftUrl, {waitUntil: 'load', timeout: 0});
            contentList = (await page.evaluate(() => {
                const els = Array.from(document.body.querySelectorAll("div"));


                const documentBodyDiv = els.find(el => el.getAttribute("data-page-section") === "page-body-div")
                // .filter(el => el.children.length > 1)

                if (!documentBodyDiv) return null

                const table = Array.from(documentBodyDiv.children).find(el => el.classList.contains("sc-giadOv"))

                if (!table) return null

                const tableContent = Array.from(table.querySelectorAll("div")).find(el => el.classList.contains("sc-bAeIUo"))


                if (!tableContent) return null


                return Array.from(tableContent.children).map(el => el.textContent || '')
            }) as string[])
            if (contentList) contentList = contentList.filter(el => el.length > 0)
        } catch (e) {
            return res.json({error: "Failed to parse table"})
        }

    }
    if (contentList === null) return res.json({error: "Failed to parse table"})


    let currentRow: string[] = []

    let resultTable: string[][] = []
    for (let i = 0; i < contentList.length; i++) {
        const el = contentList[i];
        currentRow.push(el);

        if (currentRow.length === numOfColumns || i === contentList.length - 1) {
            resultTable.push(currentRow);
            currentRow = [];
        }
    }


    res.json({table: resultTable})
}