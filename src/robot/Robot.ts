import { Fraction, Token, TokenAmount } from '@pancakeswap/sdk'
import { BigNumber, ethers, Wallet } from 'ethers'
import { Types } from 'mongoose'
import { delay } from 'bluebird'

import { RobotConfig } from '../config'
import { Logger } from '../logger'
import { RobotTypes, TradeState, TradeStateModel } from '../server/db/models/TradeStateModel'
import {
    ApproveTransaction,
    BuyTransaction,
    SellTransaction,
    Transaction,
    TransactionsTypes
} from '../server/db/models/TransactionModel'
import { ITradeStateRepo } from '../server/db/services/TradeStateRepo'
import { ITransactionsRepo, Transactions } from '../server/db/services/TransactionsRepo'
import { TipData } from '../server/utils'
import { TradeAlertsManager } from '../trade-alerts'
import { Account } from './Account'
import {
    IExchangeWrapper,
    TransactionReceipt,
    TxApproveResponse,
    TxSucceededResult
} from './PancakeSwapExchangeWrapper'
import { ProviderWrapper } from './ProviderWrapper'
import { getCid, RetryOptions, withRetry } from '../common'

export interface RobotState {
    isApproved: boolean
    tokenAmountBought: string
    profitTargetInEth: string
    sellSlippage: number
    deadline: Date //TODO: Add deadline
    stoplossPrice: string //TODO: Add stoploss
}

export class Robot {
    private readonly _logger = new Logger(Robot.name)
    private readonly _account: Account
    private readonly _cid: string = getCid()

    constructor(
        private readonly _exchangeWrapper: IExchangeWrapper,
        private readonly _provider: ProviderWrapper,
        private readonly _tradeStateRepo: ITradeStateRepo<RobotState>,
        private readonly _transactionsRepo: ITransactionsRepo,
        private readonly _alertsManager: TradeAlertsManager,
        private readonly _robotConfig: RobotConfig
    ) {
        this._account = new Account(_robotConfig.walletPrivateKey)
    }

    public async resume(tradeState: TradeState<RobotState>) {
        const token = await this._exchangeWrapper.getToken(tradeState.address)
        const wallet = this._account.getwallet(this._provider.provider)
        const robotState = tradeState.state.data

        if (!robotState.isApproved) {
            await this.approveUniswap(token, wallet, tradeState)
        }

        this._logger.info('Uniswap is approved to sell tokens')

        this.scheduleTokenCheck(token, tradeState)
        this._logger.info(`Started looking for exit`)
    }

    public async go(tipData: TipData) {
        const token = await this._exchangeWrapper.getToken(tipData.address)
        const wallet = this._account.getwallet(this._provider.provider)

        this._logger.info(`Fetched token ${token.address} Name: ${token.name || '[NO NAME]'}, Symbol: ${token.symbol || '[NO SYMBOL]'}, Decimals: ${token.decimals}`)

        const shouldEnterTrade = await this.shouldEnterTrade(token, wallet, tipData)
        if (!shouldEnterTrade) {
            this._logger.info('Shouldn\'t enter trade, exiting')
            return
        }
        this._logger.info('Should enter trade, proceeding')

        const amountOfEtherInAccount = await this._account.getwallet(this._provider.provider).getBalance()
        const percentageForTrade = BigNumber.from(this._robotConfig.percentageFromAccountToEnterWith)
        const amountForTrade = (amountOfEtherInAccount.mul(percentageForTrade)).div(100)

        this._logger.info(`Account has ${ethers.utils.formatEther(amountOfEtherInAccount)} ETH, and we are going to use ${ethers.utils.formatEther(amountForTrade)} ETH (${this._robotConfig.percentageFromAccountToEnterWith}% from the balance)`)

        const buyResult = await this._exchangeWrapper.buyToken(token, new TokenAmount(this._exchangeWrapper.WETH, amountForTrade.toString()), tipData.buySlippage, wallet)
        if (!buyResult.isSuccessful) {
            this._logger.error('Buying token failed, abandoning trade completely')
            this._alertsManager.sendTradeAlert(this._cid, `Failed to enter trade for token ${token.address}`, tipData, buyResult.error)
            return
        }

        const amountOfTokenRecieved = await this._exchangeWrapper.getBalanceOfToken(token, wallet)
        this._logger.info(`Recieved ${amountOfTokenRecieved.toFixed(2)} tokens, Trying to approve Uniswap for all amount of token: ${token.address}`)

        const profitTargetPercentage = 100 + this._robotConfig.netProfitInPercentage
        const ethTargetAmount = ((buyResult.response.value).mul(profitTargetPercentage)).div(100)
        this._logger.info(`ETH amount to recive on exit ${ethers.utils.formatEther(ethTargetAmount)} ETH (profit target is ${this._robotConfig.netProfitInPercentage}%)`)

        const tradeState = await this.createTradeStateInDB(token, wallet, ethTargetAmount, tipData.sellSlippage, amountOfTokenRecieved)

        this.createTransactionEventInDB<BuyTransaction>(
            token,
            buyResult.response.receipt,
            TransactionsTypes.Buy,
            base => ({
                ...base,
                amountIn: ethers.utils.formatEther(amountForTrade),
                amountOut: amountOfTokenRecieved.toFixed(5),
                amountOutMin: buyResult.input.amountOutMin,
                source: {
                    type: RobotTypes.BestRobot,
                    data: tipData
                }
            })
        )

        await this.approveUniswap(token, wallet, tradeState)

        this.scheduleTokenCheck(token, tradeState)
        this._logger.info(`Started looking for exit`)

        const txHash = buyResult.response.receipt.transactionHash
        this._alertsManager.sendTradeAlert(this._cid, `Entered trade successfully. Token address: ${token.address}, Eth paid: ${ethers.utils.formatEther(buyResult.response.value)}, tx hash: ${txHash} (https://bscscan.com/tx/${txHash})`)
    }

    private async scheduleTokenCheck(token: Token, tradeState: TradeState<RobotState>) {
        try {
            await delay(this._robotConfig.tradeStatusSamplingIntervalSeconds * 1000)
            await withRetry(
                this.lookForExit.bind(this, token, tradeState),
                { retries: 5 }
            )
        } catch (err) {
            this._logger.error('An error occurred while looping for exit', err)
            this._alertsManager.sendTradeAlert(this._cid, 'An error occurred while looping for exit', err)
        }
    }

    private async lookForExit(token: Token, tradeState: TradeState<RobotState>) {
        try {
            // TODO: handle multiple tokens without openniing interval for each one
            const wallet = this._account.getwallet(this._provider.provider)
            const robotState = tradeState.state.data
            const tokenAmount = new TokenAmount(token, robotState.tokenAmountBought)
            const ethTargetAmount = BigNumber.from(robotState.profitTargetInEth)
            const sellSlippage = robotState.sellSlippage

            const ethRecivedOnSell = await this._exchangeWrapper.evaluateETHAmountOutOnSell(token, tokenAmount, sellSlippage) // If I were to sell all my token considering slippage, how much ETH will I get = sellAmountConsideringSlippage
            const ethRecivedOnSellBN = ethers.BigNumber.from(ethRecivedOnSell.raw.toString())

            this._logger.info(`Amount of ETH if sell was executed now: ${ethers.utils.formatEther(ethRecivedOnSellBN)} ETH`)

            if (ethRecivedOnSellBN.lt(ethTargetAmount)) {
                this._logger.info(`Didn't Reach target of ${ethers.utils.formatEther(ethTargetAmount)} ETH when selling, will keep polling`)
                this.scheduleTokenCheck(token, tradeState)
                return
            }

            this._logger.info(`Reached target: ${ethers.utils.formatEther(ethTargetAmount)} ETH, preparing to exit position`)
            const sellResult = await this._exchangeWrapper.sellToken(token, tokenAmount, sellSlippage, wallet)
            if (!sellResult.isSuccessful) {
                this._alertsManager.sendTradeAlert(this._cid, 'Failed to exit position, aborting...', sellResult)
                this._logger.error('Failed to exit position, aborting...', sellResult.error)
                return
            }
            this._logger.info('Exited position successfully')
            tradeState.isActive = false
            // TODO: unhandled promise - we dont have to await it but we can at least add some .catch() to not cause unhandledRejections
            this.updateTradeState(tradeState, 'Exited position')

            this.createTransactionEventInDB<SellTransaction>(
                token,
                sellResult.response.receipt,
                TransactionsTypes.Sell,
                base => ({
                    ...base,
                    amountIn: tokenAmount.toFixed(5),
                    amountOut: ethRecivedOnSell.toFixed(5),
                    amountOutMin: sellResult.input.amountOutMin
                })
            )
            const txHash = sellResult.response.receipt.transactionHash
            this._alertsManager.sendTradeAlert(this._cid, `Exited trade successfully. Token address: ${token.address}, Eth received: ~${ethRecivedOnSell.toFixed(5)}, tx hash: ${txHash} (https://bscscan.com/tx/${txHash})`)

            //TODO: Check token balance and if we still have tokens(from reflection for example), calculate their worth and if it's enougth to cover the gas price sell them too // Done
            //Need to Find a better way without loosing accuracy and this whole function start to smell it need refactoring
            const tokenRemainings = await this._exchangeWrapper.getBalanceOfToken(token, wallet)

            if (tokenRemainings.equalTo('0')) {
                this._logger.info('All tokens are sold, no token remaining!')
                return
            }

            const ethRecivedOnSellRemainings = parseFloat((await this._exchangeWrapper.evaluateETHAmountOutOnSell(token, tokenRemainings, sellSlippage)).toFixed(5))
            const ethPriceInUsd = parseFloat((await this._exchangeWrapper.getPriceOfEthInUsd()).toFixed(5))

            const usdAmountOfTokenRemainings = ethRecivedOnSellRemainings * ethPriceInUsd

            // TODO: think about the 5$
            if (usdAmountOfTokenRemainings < 5) {
                this._logger.info('Selling token remainings will result in less then 5$ profit')
                return
            }
            this._logger.info(`Recieved ${tokenRemainings.toFixed(2)} tokens remainings, Trying to approve Uniswap for all amount of token: ${token.address}`)
            const approveResultTokenRemainings = await this._exchangeWrapper.approveUniswapForAllAmount(token, wallet)
            this._logger.info(`Approve result: ${JSON.stringify(approveResultTokenRemainings)}`)

            this._logger.info(`preparing to exit position`)
            const sellResultTokenRemainings = await this._exchangeWrapper.sellToken(token, tokenRemainings, sellSlippage, wallet)
            this._logger.info('Exited position successfully')
        } catch (err) {
            this._logger.error('Failed attempt to exit trade', err)
            throw err
        }
    }

    private async shouldEnterTrade(token: Token, wallet: ethers.Wallet, tipData: TipData): Promise<boolean> {
        //TODO: Add check that we aren't in position with the token already //Done
        const tokenBalance = await this._exchangeWrapper.getBalanceOfToken(token, wallet)

        if (tokenBalance.greaterThan('0')) {
            this._logger.info('Already have that token, cannot enter twice')
            return false
        }

        if (!tipData.isFirstPump) {
            this._logger.info('Not first pump, we enter only on first pump')
            return false
        }
        if (tipData.buySlippage > this._robotConfig.maxTokenSlippageForEntry) {
            this._logger.info(`Buy slippage ${tipData.buySlippage} is too high for us`)
            return false
        } else if (tipData.sellSlippage > this._robotConfig.maxTokenSlippageForEntry) {
            this._logger.info(`Sell slippage ${tipData.sellSlippage} is too high for us`)
            return false
        }

        const marketCap = await this.calcMarketCap(token)
        if (!marketCap || marketCap.lessThan(this._robotConfig.minMarketCapForEntry.toString()) || marketCap.greaterThan(this._robotConfig.maxMarketCapForEntry.toString())) {
            this._logger.info(`Market cap doesn't fit requirements. Only entering between ${this._robotConfig.minMarketCapForEntry}$ - ${this._robotConfig.maxMarketCapForEntry}$ but recieved ${marketCap?.toFixed(2)}`)
            return false
        }

        this._logger.info(`Market cap of ${token.address} is ${marketCap.toFixed(3)}$`)

        return true
    }

    private async calcMarketCap(token: Token): Promise<Fraction | null> {
        const pair = await this._exchangeWrapper.getEthPair(token)

        if (pair.reserve0.lessThan('1') || pair.reserve1.lessThan('1')) {
            this._logger.info(`Not enough reserves in the pair(res0: ${pair.reserve0}, res1: ${pair.reserve1})`)
            return null
        }

        const amountOfBnbInPool = pair.token0.address === this._exchangeWrapper.WETH.address ? pair.reserve0 : pair.reserve1
        const priceOfBnbInUsd = await this._exchangeWrapper.getPriceOfEthInUsd()

        this._logger.info(`Amount of BNB in pair's pool is ${amountOfBnbInPool.toFixed(2)} and price of BNB is ${priceOfBnbInUsd.toFixed(2)}`)

        return amountOfBnbInPool.multiply(priceOfBnbInUsd)
    }

    private async createTradeStateInDB(token: Token, wallet: Wallet, profitTargetInEth: BigNumber, sellSlippage: number, tokenAmountBought: TokenAmount): Promise<TradeState<RobotState>> {
        const state = new TradeStateModel({
            _id: new Types.ObjectId(),
            address: token.address,
            correlationId: this._cid,
            isActive: true,
            network: 'BNB', //TODO: fix
            walletInfo: {
                address: wallet.address,
                nickname: '$$$' //TODO: fix
            },
            state: {
                type: RobotTypes.BestRobot,
                data: {
                    isApproved: false,
                    deadline: new Date(), //TODO: implement
                    stoplossPrice: '6', //TODO: implement
                    profitTargetInEth: profitTargetInEth.toString(),
                    sellSlippage,
                    tokenAmountBought: tokenAmountBought.raw.toString()
                }
            }
        })
        this._logger.info('Saving initial robot state to db', state)
        const result = await this._tradeStateRepo.create(state)
        if (result.success) {
            this._logger.info('Robot state was saved successfully', result)
            return result.result
        } else {
            this._logger.error('Failed to create initial robot state', result.error)
            this._alertsManager.sendTradeAlert(this._cid, 'Failed to create initial robot state', result)
            return state
        }
    }

    private async createTransactionEventInDB<T extends Transactions>(token: Token, receipt: TransactionReceipt, type: TransactionsTypes, getTransaction: (base: Transaction<T['type']>) => T) {
        const gasPaidInGwei = (receipt.gasUsed).mul(receipt.effectiveGasPrice)
        const totalPaidForGasInEth = ethers.utils.formatUnits(gasPaidInGwei, 'ether')

        const gasUnitUsed = receipt.gasUsed
        const gasPriceInGwei = ethers.utils.formatUnits(receipt.effectiveGasPrice, 'gwei')

        const base: Transaction<T['type']> = {
            type,
            network: this._provider.networkName,
            tokenAddress: token.address,
            correlationId: this._cid,
            gasUnitUsed: gasUnitUsed.toString(),
            gasPriceInGwei: gasPriceInGwei.toString(),
            totalPaidForGasInEth: totalPaidForGasInEth.toString(),
            from: receipt.from,
            to: receipt.to
        }
        const eventToCreate = getTransaction(base)

        this._logger.info(`Saving ${type} Event to db`, eventToCreate)
        const result = await this._transactionsRepo.create(eventToCreate)
        if (result.success) {
            this._logger.info('Event was saved successfully', result)
        } else {
            this._logger.error(`Failed to create ${eventToCreate.type} Event`, result.error)
            this._alertsManager.sendTradeAlert(this._cid, `Failed to create ${eventToCreate.type} Event`, result.error)
        }
    }

    private async approveUniswap(token: Token, wallet: Wallet, tradeState: TradeState<RobotState>) {
        let successfulApproveResult: TxSucceededResult<TxApproveResponse>
        try {
            const retryOptions: RetryOptions = { retries: 5 }
            successfulApproveResult = await withRetry<TxSucceededResult<TxApproveResponse>>(async () => {
                const approveResult = await this._exchangeWrapper.approveUniswapForAllAmount(token, wallet)
                if (!approveResult.isSuccessful) {
                    this._logger.error(`Failed attempt to approve Uniswap for all amount for ${token.address}: ${approveResult.error}`)
                    throw new Error(approveResult.error)
                }

                return approveResult
            }, retryOptions)
        } catch (err) {
            this._alertsManager.sendTradeAlert(this._cid, `Failed to approve Uniswap for all amount for ${token.address}, abandoning trade`, err)
            throw err
        }

        this._logger.info(`Successfully approved Uniswap to sell tokens`, successfulApproveResult)
        this.createTransactionEventInDB<ApproveTransaction>(
            token,
            successfulApproveResult.response.receipt,
            TransactionsTypes.Approve,
            (base) => ({
                ...base,
                allowanceAmount: successfulApproveResult.response.allowanceAmount.toFixed(5)
            })
        )
        tradeState.state.data.isApproved = true
        this.updateTradeState(tradeState, 'Uniswap Approved')
    }

    private async updateTradeState(tradeState: TradeState<RobotState>, description: string) {
        this._logger.info('Updating trade state', tradeState)
        const result = await this._tradeStateRepo.update(tradeState._id, tradeState)
        if (result.success) {
            this._logger.info(`Updated trade state "${description}" successfully`, result)
        } else {
            this._logger.error(`Failed to update trade state "${description}"`, result)
            this._alertsManager.sendTradeAlert(this._cid, `Failed to update trade state "${description}"`, result)
        }
    }
}
