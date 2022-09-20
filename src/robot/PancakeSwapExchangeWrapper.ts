import { CurrencyAmount, Fetcher, Pair, Percent, Price, Route, Token, TokenAmount, Trade, TradeType, WETH } from "@pancakeswap/sdk";
import { BigNumber, ethers, Wallet } from "ethers";
import RouterAbi from '../abis/Router.json';
import { Logger } from "../logger";
import { ProviderWrapper } from "./ProviderWrapper";

export interface IExchangeWrapper {
    getToken(address: string): Promise<Token>
    getEthPair(token: Token): Promise<Pair>
    getPriceOfEthInUsd(): Promise<Price>
    evaluateETHAmountOutOnSell(token: Token, amountToBuy: TokenAmount, sellSlippage: number): Promise<CurrencyAmount>
    get WETH(): Token;
    buyToken(token: Token, amount: TokenAmount, slippage: number, wallet: Wallet): Promise<TxResult<TxBuySellResponse, TxBuySellInput>>
    sellToken(token: Token, amount: TokenAmount, slippage: number, wallet: Wallet): Promise<TxResult<TxBuySellResponse, TxBuySellInput>>
    getBalanceOfToken(token: Token, wallet: Wallet): Promise<TokenAmount>
    approveUniswapForAllAmount(token: Token, wallet: Wallet, retries?: number): Promise<TxResult<TxApproveResponse>>
}

// any suggestions on where to put this and future interfaces of ethers.js?
export interface TransactionReceipt {
    to: string,
    from: string,
    contractAddress: string | null,
    transactionIndex: number,
    gasUsed: BigNumber,
    logsBloom: string,
    blockHash: string,
    transactionHash: string,
    logs: any[],
    blockNumber: number,
    confirmations: number,
    cumulativeGasUsed: BigNumber,
    effectiveGasPrice: BigNumber,
    status: number,
    type: number,
    byzantium: boolean,
    events: any[]
}

export interface TxBuySellResponse {
    value: BigNumber
    receipt: TransactionReceipt
}

export interface TxBuySellInput {
    amountOutMin: string
}

export interface TxApproveResponse {
    allowanceAmount: TokenAmount
    receipt: TransactionReceipt
}

export interface TxSucceededResult<TResponse, TInput = undefined> {
    isSuccessful: true
    response: TResponse
    input: TInput
}

export interface TxFailedResult {
    isSuccessful: false
    error: any
}

export type TxResult<TResponse, TInput = undefined> = TxSucceededResult<TResponse, TInput> | TxFailedResult

export class PancakeSwapExchangeWrapper implements IExchangeWrapper {
    private _logger = new Logger(PancakeSwapExchangeWrapper.name)
    private readonly _busdToken = ethers.utils.getAddress('0xe9e7cea3dedca5984780bafc599bd69add087d56')
    private readonly _routerAddress = ethers.utils.getAddress('0x10ed43c718714eb63d5aa57b78b54704e256024e')

    constructor(
        private readonly _providerManager: ProviderWrapper
    ) { }

    public getToken(address: string): Promise<Token> {
        return Fetcher.fetchTokenData(this._providerManager.chainId, ethers.utils.getAddress(address), this._provider)
    }

    public getEthPair(token: Token): Promise<Pair> {
        return Fetcher.fetchPairData(this.WETH, token, this._provider);
    }

    public async getPriceOfEthInUsd() {
        const busdToken = await this.getToken(this._busdToken)
        const busdPair = await this.getEthPair(busdToken)
        return busdPair.priceOf(this.WETH)
    }

    public async evaluateETHAmountOutOnSell(token: Token, amountToBuy: TokenAmount, sellSlippage: number): Promise<CurrencyAmount> {
        const tokenEthPair = await Fetcher.fetchPairData(token, this.WETH, this._provider);
        const tokenEthRoute = new Route([tokenEthPair], token)
        const trade = new Trade(
            tokenEthRoute,
            amountToBuy,
            TradeType.EXACT_INPUT
        );

        const sellSlippageTolerance = new Percent(sellSlippage.toString(), '100');
        const sellAmountConsideringSlippage = trade.minimumAmountOut(sellSlippageTolerance)

        return sellAmountConsideringSlippage
    }

    public get WETH() {
        return WETH[this._providerManager.chainId]
    }

    public async buyToken(token: Token, amount: TokenAmount, slippage: number, wallet: Wallet): Promise<TxResult<TxBuySellResponse, TxBuySellInput>> {
        try {
            const router = new ethers.Contract(this._routerAddress, RouterAbi, this._provider).connect(wallet)
            const tokenEthPair = await this.getEthPair(token)
            const tokenEthRoute = new Route([tokenEthPair], this.WETH)
            const trade = new Trade(
                tokenEthRoute,
                amount,
                TradeType.EXACT_INPUT
            );

            const slippageTolerance = new Percent(slippage.toString(), '100');
            const amountOutMin = ethers.BigNumber.from(trade.minimumAmountOut(slippageTolerance).raw.toString())
            const amountIn = ethers.BigNumber.from((trade.inputAmount.raw).toString())
            const path = [this.WETH.address, token.address]

            const nowInUnixSeconds = Math.floor(Date.now() / 1000)
            const deadlineInMinutes = 3
            const deadline = nowInUnixSeconds + (60 * deadlineInMinutes)

            this._logger.info(`Creating tx (Buy) with params: amountOutMin: ${ethers.utils.formatUnits(amountOutMin, token.decimals)}, path: [${path.join(', ')}], address: ${wallet.address}, deadline: ${deadline}, value: ${ethers.utils.formatEther(amountIn)} ETH`)

            const methodName = slippage > 0 ? 'swapExactETHForTokensSupportingFeeOnTransferTokens' : 'swapExactETHForTokens'

            const tx = await router[methodName](
                amountOutMin,
                path,
                wallet.address,
                deadline,
                {
                    gasLimit: 700000,
                    value: amountIn
                }
            )

            this._logger.info("Sending tx, waiting to mine")
            const receipt = await tx.wait();
            this._logger.info(`Tx was mined successfully`, receipt)
            return { isSuccessful: true, input: { amountOutMin: ethers.utils.formatEther(amountOutMin) }, response: { value: tx.value, receipt } }
        } catch (error) {
            this._logger.error('Buy transaction failed', error)
            return { isSuccessful: false, error }
        }
    }

    public async sellToken(token: Token, amount: TokenAmount, slippage: number, wallet: Wallet): Promise<TxResult<TxBuySellResponse, TxBuySellInput>> {
        try {
            const router = new ethers.Contract(this._routerAddress, RouterAbi, this._provider).connect(wallet)
            const pair = await this.getEthPair(token)
            const tokenEthRoute = new Route([pair], token)

            const trade = new Trade(
                tokenEthRoute,
                amount,
                TradeType.EXACT_INPUT
            );

            const slippageTolerance = new Percent(slippage.toString(), '100');
            const amountOutMin = ethers.BigNumber.from(trade.minimumAmountOut(slippageTolerance).raw.toString())
            const amountIn = ethers.BigNumber.from((trade.inputAmount.raw).toString())
            const path = [token.address, this.WETH.address]

            const nowInUnixSeconds = Math.floor(Date.now() / 1000)
            const deadlineInMinutes = 3
            const deadline = nowInUnixSeconds + (60 * deadlineInMinutes)

            this._logger.info(`Creating tx (Sell) with params: amountOutMin: ${ethers.utils.formatEther(amountOutMin)}, path: [${path.join(', ')}], address: ${wallet.address}, deadline: ${deadline}, value: ${ethers.utils.formatUnits(amountIn, token.decimals)} ETH`)

            const methodName = slippage > 0 ? 'swapExactTokensForETHSupportingFeeOnTransferTokens' : 'swapExactTokensForETH'

            const tx = await router[methodName](
                amountIn,
                amountOutMin,
                path,
                wallet.address,
                deadline,
                {
                    gasLimit: 700000,
                }
            )

            this._logger.info("Sending tx, waiting to mine")
            const receipt = await tx.wait();
            this._logger.info(`Tx was mined successfully`, receipt)

            return { isSuccessful: true, input: { amountOutMin: ethers.utils.formatEther(amountOutMin) }, response: { value: tx.value, receipt } }

        } catch (error) {
            this._logger.error('Sell transaction failed', error)
            return { isSuccessful: false, error }
        }
    }

    public async getBalanceOfToken(token: Token, wallet: Wallet): Promise<TokenAmount> {
        const tokenContract = new ethers.Contract(token.address, ERC20_ABI, wallet);
        const tokenBalanceHex = (await tokenContract.balanceOf(wallet.address)).toHexString()
        return new TokenAmount(token, tokenBalanceHex)
    }

    public async approveUniswapForAllAmount(token: Token, wallet: Wallet, retries = 3): Promise<TxResult<TxApproveResponse>> {
        try {
            //TODO: Implement retries && check how to get approve result directly
            const tokenContract = new ethers.Contract(token.address, ERC20_ABI, wallet);
            const amountOfTokens = await this.getBalanceOfToken(token, wallet)
            const amountIn = ethers.BigNumber.from((amountOfTokens.raw).toString())

            const tx = await tokenContract.approve(this._routerAddress, amountIn)
            const receipt = await tx.wait()
            this._logger.info(`Tx was mined successfully`, receipt)

            return { isSuccessful: true, response: { allowanceAmount: amountOfTokens, receipt }, input: undefined }

        } catch (error) {
            this._logger.error('Approve transcation failed', error)
            return { isSuccessful: false, error }
        }
    }

    private get _provider() {
        return this._providerManager.provider
    }
}

const ERC20_ABI = [
    // Read-Only Functions
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function totalSupply() public view returns (uint256)",
    "function allowance(address _owner, address _spender) public view returns (uint256 remaining)",

    // Authenticated Functions
    "function transfer(address to, uint amount) returns (bool)",
    "function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)",
    "function approve(address _spender, uint256 _value) public returns (bool success)",

    // Events
    "event Transfer(address indexed from, address indexed to, uint amount)",
    "event Approval(address indexed _owner, address indexed _spender, uint256 _value)"
]
