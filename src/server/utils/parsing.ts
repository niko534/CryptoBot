import { ethers } from "ethers";
import { Logger } from "../../logger";

export interface TipData {
    isFirstPump: boolean
    address: string
    buySlippage: number
    sellSlippage: number
}

const logger = new Logger('Parser')

// TODO: log the steps and return an error message
export const parseTelegramMessage = (inputText: string) => {
    logger.info('Started parsing', inputText)
    const lines: Array<String> = inputText.split("\n");
    const numLines = lines.length;

    const result: TipData = {
        isFirstPump: false,
        address: '',
        buySlippage: NaN,
        sellSlippage: NaN
    }

    for (let i = 0; i < numLines; i++) {
        const line = lines[i];
        lines[i] = line.replace(/ /g, '');
        if (lines[i].indexOf("Address:") !== -1) {
            const fields = lines[i].split(':');
            let string = fields[1].substring(fields[1].indexOf("`") + 1)
            string = string.substring(0, string.indexOf("`"));
            const address = ethers.utils.getAddress(string) // checksum address
            logger.info(`Address is ${address}`)
            result.address = address
        }

        if (lines[i].indexOf("Slippage") !== -1) {
            const buyStrings = lines[i + 1].split('%');
            let buySlippage = takeOnlyNumber(buyStrings[0])
            logger.info(`Buy slippage is ${buySlippage}`)
            if (buySlippage > 0) { buySlippage += 2 }
            result.buySlippage = buySlippage

            const sellStrings = lines[i + 2].split('%');
            let sellSlippage = takeOnlyNumber(sellStrings[0])
            logger.info(`Sell slippage is ${sellSlippage}`)
            if (sellSlippage > 0) { sellSlippage += 2 }
            result.sellSlippage = sellSlippage
        }

        if (lines[i].indexOf("firstpump") !== -1) {
            result.isFirstPump = true
        }
    }
    return result
}

const takeOnlyNumber = (text: string): number => {
    const numberPattern = /\d+/g;
    const number = text.match(numberPattern)?.filter(x => x)[0]
    return Number(number)
}
