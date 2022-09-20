import { Percent, Route, Token, TokenAmount, Trade, TradeType } from "@pancakeswap/sdk";
import { BigNumber, Wallet } from "ethers";
import { config } from "../../config";
import { Logger } from "../../logger";
import { IExchangeWrapper, PancakeSwapExchangeWrapper } from "../PancakeSwapExchangeWrapper";
import { SimulatorProviderWrapper } from "./SimulatorProviderWrapper";


export interface ExecutionReadyTradeParameters {
    amountOutMin: BigNumber
    amountIn: BigNumber
    path: string[]
    deadline: number
    gasLimit: number
    methodName: string
}

interface SimulationSucceededResult {
    isSuccessful: true
    amount: TokenAmount
    slippage: number
}

interface SimulationFailedResult {
    isSuccessful: false
}

type SimulationResult = SimulationSucceededResult | SimulationFailedResult

export class TxSimulator {
    private readonly _logger = new Logger(TxSimulator.name)

    constructor(
        private readonly _exchangeWrapper: IExchangeWrapper,
        private readonly _simulatorWallet: Wallet
    ) { }

    //TODO: remove build, use ctor
    static build(wallet: Wallet) {
        // const simulatorProviderWrapper: SimulatorProviderWrapper = new SimulatorProviderWrapper(config.provider)
        // const exchangeWrapper: IExchangeWrapper = new PancakgeSwapExchangeWrapper(simulatorProviderWrapper)
        // const simulatorWallet = config.provider.network === 'DEVELOPMENT' ? simulatorProviderWrapper.devWallet : new Wallet(wallet, simulatorProviderWrapper.provider)

        // return new TxSimulator(exchangeWrapper, simulatorWallet)
    }
    async simulateBuy(token: Token, amount: TokenAmount, slippage: number): Promise<SimulationResult> {
        const buyResult = await this._exchangeWrapper.buyToken(token, amount, slippage, this._simulatorWallet)
        if (buyResult.isSuccessful) {
            this._logger.info(`Sucsseded on first run `)
            return { isSuccessful: true, amount, slippage }
        }
        const result = await this.handleBuyErrors(buyResult.error, token, amount, slippage)
        return result
    }
    async simulateSell() { }
    async simulateApprove() { }
    private async handleBuyErrors(error: any, token: Token, amount: TokenAmount, slippage: number): Promise<SimulationResult> {
        const errorReason = error?.data?.reason
        this._logger.info(`Recived error: ${errorReason}, handeling...`)

        switch (errorReason) {
            case 'PancakeRouter: INSUFFICIENT_OUTPUT_AMOUNT':
                let newSlippage = slippage + 1
                while (newSlippage <= 15) {
                    this._logger.info(`Retring trade with new slippage: ${newSlippage}`)
                    const result = await this._exchangeWrapper.buyToken(token, amount, newSlippage, this._simulatorWallet)
                    if (result.isSuccessful) {
                        return { isSuccessful: true, amount, slippage: newSlippage }
                    }
                    newSlippage++
                }
                this._logger.info(`New Slippage Is too high won't retry, aboarting...`)
                return { isSuccessful: false }

            default:
                this._logger.info(`Could not find a handler for this error, will not enter at all `)
                return { isSuccessful: false }
        }
    }
}
