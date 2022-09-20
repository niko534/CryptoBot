import { ChainId } from '@pancakeswap/sdk';
import { Options as SMTPTransportOptions } from "nodemailer/lib/smtp-transport";

export enum Networks {
    binanceSmartChain = 'BSC',
    binanceSmartChainDevelopment = 'BSC-DEVELOPMENT'
}

export interface RobotConfig {
    // Wallet
    walletPrivateKey: string

    // Entrance
    minMarketCapForEntry: number
    maxMarketCapForEntry: number
    maxTokenSlippageForEntry: number // 15% for both buy/sell fees + uniswap slippage
    gasPriceLimit: number

    /** Percentage from account to enter a trade with, for example: If account has 100ETH and this value is 20, we'll enter with 20ETH - which is 20% of the total balance of the account   */
    percentageFromAccountToEnterWith: number

    // Exit
    netProfitInPercentage: number
    tradeStatusSamplingIntervalSeconds: number
}

export interface AccountManagerConfig {
    routerAddress: string
}

export interface ServerConfig {
    port: number
}

export interface MockTipDataTelegramBotConfig {
    botToken: string
    msgIntervalInSec: number
}

export interface TradeAlertsTelegramBotConfig {
    botToken: string
    alertsGroupChatId: number
    msgQueueCapacity: number
}

export interface TradeAlertsMailerConfig {
    mailTransport: SMTPTransportOptions
    sender: string
    recipients: string[]
}

export interface TelegramClientConfig {
    telegramApiId: number
    telegramApiHash: string
    telegramSessionString: string
    tipDataSourceChatId: number
    robotUrl: string
}

export interface CommonConfig {
    env: string
}

export interface ProviderConfig {
    network: Networks
    chainId: ChainId
    nodeEndPoint: string
    devWallets?: string[]
}

export interface LoggerConfig {
    dir: string
    appName: string
}

export interface MainConfig {
    provider: ProviderConfig
    common: CommonConfig
    robot: RobotConfig
    accountManager: AccountManagerConfig
    server: ServerConfig
    mockTipDataTelegramBot: MockTipDataTelegramBotConfig
    telegramClient: TelegramClientConfig
    logger: LoggerConfig
    tradeAlerts: {
        telegramBot: TradeAlertsTelegramBotConfig
        mailer: TradeAlertsMailerConfig
    }
}
