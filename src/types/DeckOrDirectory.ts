import Deck from "./dbmodel/Deck";
import {Directory} from "./dbmodel/Directory";


export interface DeckOrDirectory extends Deck, Directory {
    isDirectory: boolean
}



