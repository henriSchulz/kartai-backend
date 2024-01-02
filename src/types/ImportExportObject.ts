import {Directory} from "./dbmodel/Directory";
import Deck from "./dbmodel/Deck";
import {Card} from "./dbmodel/Card";
import {FieldContent} from "./dbmodel/FieldContent";
import {CardType} from "./dbmodel/CardType";
import {Field} from "./dbmodel/Field";
import {CardTypeVariant} from "./dbmodel/CardTypeVariant";

export default interface ImportExportObject {
    directories: Directory[]
    decks: Deck[]
    cards: Card[]
    fieldContents: FieldContent[]
    cardTypes: CardType[]
    fields: Field[]
    cardTypeVariants: CardTypeVariant[]
}

