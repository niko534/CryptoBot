import { ChainId } from '@pancakeswap/sdk'
import { ethers } from 'ethers'
import {
    AccountManagerConfig,
    CommonConfig,
    MainConfig,
    Networks,
    RobotConfig,
    ServerConfig,
    MockTipDataTelegramBotConfig,
    TelegramClientConfig,
    TradeAlertsTelegramBotConfig,
    TradeAlertsMailerConfig,
    ProviderConfig,
    LoggerConfig
} from './types'


// Common config
const env = process.env.NODE_ENV || 'dev'

// Server config
const port = Number(process.env.PORT || 5000)

// Network and wallets config
const network = process.env.NETWORK as Networks || Networks.binanceSmartChainDevelopment
const chainId: number = ChainId.MAINNET
const mainWalletPrivateKey = process.env.MAIN_WALLET_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const autoTraderPrivateKey = process.env.AUTO_TRADER_PRIVATE_KEY || '0x38883d0e698ca117552871d989849e10e6bc36a6097de51677166ff646613e1e'
const routerAddress = process.env.ROUTER_ADDRESS || ethers.utils.getAddress('0x10ed43c718714eb63d5aa57b78b54704e256024e')
const nodeEndPoint = process.env.NODE_ENDPOINT || 'https://patient-restless-moon.bsc.quiknode.pro/a3b316ca1deb5f213869c42572c14775bc3f4083/' //BSC
// const nodeEndPoint = process.env.NODE_ENDPOINT || 'https://bsc-dataseed.binance.org/' //BSC
// const nodeEndPoint = process.env.NODE_ENDPOINT || 'https://mainnet.infura.io/v3/32a8de4a0f6a4559960d730ed9f0c08f', // ETH

// Trading config
const minMarketCapForEntry = Number(process.env.MIN_MARKET_CAP_FOR_ENTRY) || 30000 // 30,000
const maxMarketCapForEntry = Number(process.env.MAX_MARKET_CAP_FOR_ENTRY) || 300000000 // 300,000,000
const maxTokenSlippageForEntry = Number(process.env.MAX_TOKEN_SLIPPAGE_FOR_ENTRY || 15) // 15% for both buy/sell fees + uniswap slippage
const gasPriceLimit = Number(process.env.GAS_PRICE_LIMIT || 400000) //500,000
const netProfitInPercentage = Number(process.env.NET_PROFIT_IN_PERCENTAGE || -30) // 30% Profit after fee calc
const tradeStatusSamplingIntervalSeconds = Number(process.env.TRADE_STATUS_SAMPLING_INTERVAL_IN_SEC || 3)
const percentageFromAccountToEnterWith = Number(process.env.PERCENTAGE_FROM_ACCOUNT_FOR_ENTRY || 5)

// Trade alerts mailer config
const tradeAlertsMailTransport = JSON.parse(process.env.TRADE_ALERTS_MAIL_TRANSPORT || '{"service":"hotmail","auth":{"user":"pumpagadi-dev@outlook.com","pass":"Pump agadi dev!"}}')
const tradeAlertsMailSender = process.env.TRADE_ALERTS_MAIL_SENDER || 'pumpagadi-dev@outlook.com'
const tradeAlertsMailRecipients = JSON.parse(process.env.TRADE_ALERTS_MAIL_RECIPIENTS || '["pumpagadi-dev@outlook.com"]')

// Trade alerts Telegram Bot config
const tradeAlertsTelegramBotToken = process.env.TRADE_ALERTS_TELEGRAM_BOT_TOKEN || '5032824959:AAE4LZlzGV4SGD_czwCOkAXVpqo7EYWG9mM'
const alertsGroupChatId = Number(process.env.TRADE_ALERTS_TELEGRAM_GROUP_CHAT_ID || -644478674)
const msgQueueCapacity = Number(process.env.TRADE_ALERTS_TELEGRAM_BOT_MSG_Q_CAPACITY || 100)

// Mock tip data Telegram Bot config
const mockTipDataTelegramBotToken = process.env.MOCK_TIP_DATA_TELEGRAM_BOT_TOKEN || '5067239989:AAHVGAs3_sjE1NHEFSltgcx9N_7jPhX0fqw'
const msgIntervalInSec = Number(process.env.MOCK_TIP_DATA_TELEGRAM_BOT_MSG_INTERVAL_IN_SEC || 10)

// Telegram Client config
const telegramApiId = Number(process.env.TELEGRAM_API_ID || 9822238)
const telegramApiHash = process.env.TELEGRAM_API_HASH || 'cfed51e714e0d04fca1d8d785067c3f5'
const telegramSessionString = process.env.TELEGRAM_SESSION_STRING || '1BAAOMTQ5LjE1NC4xNjcuOTEAUG3kiugW/yry0bNLs4cTxyFeQW5PM6/0I9usr/zwJvl4/peBcG0WnJuRvi92bbCu+usDbAPBxwOKgslFqDpsDgZuVfKRIUP/dZUhzIBwsLGG/gLKeOerUw2A9X9mGZYjRM9nLdFE8MpN8Qqs8iDjNcx8/XPfe68C2n1ograsas/WCX8BQfI/N3vWnjF26EQVfhnvKzltcMQxmI0n1uqjDUMBtj+fsI2RUl7ZYMSDP+F0ZHZhvP18rGCpXnbrXHtHmLTvU+xFjNnjXPNur6Iac+hO8PRp4gibTRZC0lahR930i8GNB/5oy6Gx2bfcmzeU+svl96yELpUDAnQcmZ2nMMM=' // empty session string will prompt login
// const tipDataSourceChatId = Number(process.env.CHAT_ID || 5067239989) // @super_pump_super_bot chat id
// const tipDataSourceChatId = Number(process.env.CHAT_ID || -686434612) // Best Token Ever - ALERTS PROD chat id
const tipDataSourceChatId = Number(process.env.CHAT_ID || -644478674) // Best Token Ever - ALERTS DEV chat id
// const tipDataSourceChatId = Number(process.env.CHAT_ID || -1001519789792) // fastest alerts chat id
const robotUrl = process.env.ROBOT_URL || 'http://localhost:9000'

const robotConfig: RobotConfig = {
    // Entrance and Exit
    walletPrivateKey: mainWalletPrivateKey,
    minMarketCapForEntry,
    maxMarketCapForEntry,
    maxTokenSlippageForEntry,
    gasPriceLimit,
    percentageFromAccountToEnterWith,
    netProfitInPercentage,
    tradeStatusSamplingIntervalSeconds
}

const accountManagerConfig: AccountManagerConfig = {
    routerAddress,
}

const serverConfig: ServerConfig = {
    port
}

const tradeAlertsTelegramBotConfig: TradeAlertsTelegramBotConfig = {
    botToken: tradeAlertsTelegramBotToken,
    alertsGroupChatId,
    msgQueueCapacity
}

const tradeAlertsMailerConfig: TradeAlertsMailerConfig = {
    mailTransport: tradeAlertsMailTransport,
    sender: tradeAlertsMailSender,
    recipients: tradeAlertsMailRecipients
}

const mockTipDataTelegramBotConfig: MockTipDataTelegramBotConfig = {
    botToken: mockTipDataTelegramBotToken,
    msgIntervalInSec
}

const telegramClientConfig: TelegramClientConfig = {
    telegramApiHash,
    telegramApiId,
    telegramSessionString,
    tipDataSourceChatId,
    robotUrl
}

const commonConfig: CommonConfig = {
    env
}

const providerConfig: ProviderConfig = {
    network,
    chainId,
    nodeEndPoint,
    devWallets: network === Networks.binanceSmartChainDevelopment ? [mainWalletPrivateKey] : undefined
}

const logger: LoggerConfig = {
    dir: process.env.LOGGER_DIR || '',
    appName: process.env.APP_NAME || 'BestRobotEver'
}

export const config: MainConfig = {
    provider: providerConfig,
    common: commonConfig,
    robot: robotConfig,
    accountManager: accountManagerConfig,
    server: serverConfig,
    mockTipDataTelegramBot: mockTipDataTelegramBotConfig,
    telegramClient: telegramClientConfig,
    logger,
    tradeAlerts: {
        telegramBot: tradeAlertsTelegramBotConfig,
        mailer: tradeAlertsMailerConfig
    },
}

export * from './types'

