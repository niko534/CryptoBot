import { Telegraf } from 'telegraf'

import { TradeAlertsTransporter } from './types'
import { Logger } from '../logger'
import { formatArgs } from './utils'


export class TradeAlertsTelegramBot implements TradeAlertsTransporter {
    private readonly _logger = new Logger(TradeAlertsTelegramBot.name)
    private readonly _bot: Telegraf
    private readonly _alertsGroupId: number

    constructor(botToken: string, alertsGroupId: number) {
        this._alertsGroupId = alertsGroupId
        this._bot = new Telegraf(botToken)
    }

    async sendMessage(correlationId: string, msg: string, ...args: any[]): Promise<void> {
        try {
            this._logger.info('Sending message to trade alerts group...')
            await this._bot.telegram.sendMessage(this._alertsGroupId, `[correlationId: ${correlationId}]: ${msg} ${formatArgs(args)}`)
            this._logger.info('Sent message successfully.')
        } catch (err) {
            this._logger.error(`Failed to send message: ${JSON.stringify(msg)}`, err)
        }
    }
}
