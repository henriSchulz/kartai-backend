export const ID_PROPERTIES = {
    length: 16,
    characters: 'abcdefghijklmnopqrstuvwxyz0123456789'
}

export function getDateTimeString(timestamp: number) {
    const padL = (nr: any, len = 2, chr = `0`) => `${nr}`.padStart(2, chr);

    const dt = new Date(timestamp)

    return `${
        padL(dt.getDate())}/${
        padL(dt.getMonth() + 1)}/${
        dt.getFullYear()} - ${
        padL(dt.getHours())}:${
        padL(dt.getMinutes())}:${
        padL(dt.getSeconds())}`
}

export function generateModelId(length: number = ID_PROPERTIES.length) {
    const characters = ID_PROPERTIES.characters
    let id = '';

    for (let i = 0; i < length; i++) {
        id += characters[Math.floor(Math.random() * characters.length)];
    }
    return id;
}

export function chunkSubstr(str: string, size: number): string[] {
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)

    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
        chunks[i] = str.substr(o, size)
    }

    return chunks
}
