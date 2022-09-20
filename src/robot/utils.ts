import { Price, JSBI } from "@pancakeswap/sdk";
import { ethers } from "ethers";

export const stringifyPrice = (price: Price, digits: number = 100): string => {
    return price.toSignificant(digits)
}

export const getPercentageFromBigNumberInWei = (amount: ethers.BigNumber, percentage: number): JSBI => {
    if (percentage % 1 != 0) {
        console.error('percentage cannot contain decimals')
    }
    const ethAmount: JSBI = JSBI.BigInt(amount.toHexString());
    const denominator: JSBI = JSBI.BigInt(100 / percentage)

    const result: JSBI = JSBI.divide(ethAmount, denominator)

    return result
}
