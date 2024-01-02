import {createLogger, transports, format} from "winston"
import {getDateTimeString} from "./utils";


const customFormat = format.combine(format.timestamp(), format.printf(info => {
    return `${getDateTimeString(info.timestamp)} [${info.level.toUpperCase()}] ${info.message}`
}))

const logger = createLogger({
    format: customFormat,
    transports: [
        new transports.Console(),
        new transports.File({filename: `${__dirname}/logs/latest.log`})
    ]
})

export {logger}