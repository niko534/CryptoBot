import Axios, { AxiosError } from 'axios'
// @ts-ignore
import input from 'input'
import { TelegramClient } from 'telegram'
import { NewMessage, NewMessageEvent } from 'telegram/events'
import { EventBuilder } from 'telegram/events/common'
import { StringSession } from 'telegram/sessions'
import { config } from '../config'
import { Logger } from '../logger'
import { parseTelegramMessage } from '../server/utils/parsing'
import { TradeAlertsManager, TradeAlertsTelegramBot } from '../trade-alerts'


const logger = new Logger("TelegramClient")
logger.info(`Started with config`, config)
const clientConfig = config.telegramClient;

const telegramAlerts = new TradeAlertsTelegramBot(config.tradeAlerts.telegramBot.botToken, config.tradeAlerts.telegramBot.alertsGroupChatId)
const tradesAlertManager = new TradeAlertsManager([telegramAlerts]);

let wasDisconnected = false;

(async () => {
    logger.info('Loading interactive example...')
    const client = new TelegramClient(
        new StringSession(clientConfig.telegramSessionString),
        clientConfig.telegramApiId,
        clientConfig.telegramApiHash,
        {
            connectionRetries: 66666666666, // Keep reconnecting forever. -1/undefined didn't work. Docs is a colleciton of lies
        }
    )
    await client.start({
        phoneNumber: async () => await input.text('Please enter your number: '),
        password: async () => await input.text('Please enter your password: '),
        phoneCode: async () => await input.text('Please enter the code you received: '),
        onError: (err) => { logger.error(err) }
    });

    const handleConnectionStateChange = (event: { state?: number }) => {
        if (event.state === undefined) {
            return
        }

        if (event.state <= 0) {
            tradesAlertManager.sendTradeAlert("TELEGRAM-CLIENT", `Telegram client has lost connection. State is ${event.state}`)
            logger.warn("****** DISCONNECTED *******", event.state)
            wasDisconnected = true
        } else {
            logger.info("****** CONNECTED *******", event.state)
            if (wasDisconnected) {
                tradesAlertManager.sendTradeAlert("TELEGRAM-CLIENT", `Telegram client regained connection successfully after disconnecting. State is ${event.state}`)
                wasDisconnected = false
            }
        }
    }
    const eventBuilder = new EventBuilder({})
    client._eventBuilders.push([eventBuilder, handleConnectionStateChange])

    logger.info('You should now be connected.')
    logger.info(`Listening to chat id ${clientConfig.tipDataSourceChatId}`)
    logger.info(client.session.save()) // Save this string to avoid logging in again
    await client.sendMessage('me', { message: 'Hello!' })

    async function handleNewMessages(event: NewMessageEvent) {
        const message = event.message
        if (!message.chatId) {
            logger.warn('no chat id found')
            return
        }

        logger.info(`Received message from chat id ${message.chatId}`)
        if (message.chatId.valueOf() === clientConfig.tipDataSourceChatId) {
            try {
                logger.info('Received message from selected chat. Sending to server.', message.text)
                const parsedMessage = parseTelegramMessage(message.text)
                logger.info(`Parsed message`, parsedMessage)
                if (!parsedMessage.isFirstPump) {
                    logger.info("Not first pump")
                    return
                }
                const robotUrl = `${clientConfig.robotUrl}/robot`
                logger.info(`Sending message to server ${robotUrl}`)
                const response = await Axios.post(robotUrl, parsedMessage, {
                    validateStatus: status => status < 500
                })
                logger.info(`Server responded with status ${response.status} and the following message: ${response.data}`)
            } catch (error) {
                const err = error as AxiosError
                logger.error(`Server failed with the following error:`, err.response?.data)
            }
        } else {
            // logger.info(`Message ${message.chatId} not from target chat ${clientConfig.tipDataSourceChatId}`)
        }
    }

    client.addEventHandler(handleNewMessages, new NewMessage({}))
})()
