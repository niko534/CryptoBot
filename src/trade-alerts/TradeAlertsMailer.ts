import { createTransport, Transporter, SendMailOptions } from 'nodemailer'
import { Options as SMTPTransportOptions } from 'nodemailer/lib/smtp-transport'

import { TradeAlertsTransporter } from './types'
import { Logger } from '../logger'
import { formatArgs } from './utils'


export class TradeAlertsMailer implements TradeAlertsTransporter {
    private readonly _logger = new Logger(TradeAlertsMailer.name)
    private _transporter: Transporter
    private readonly _sender: string
    private readonly _recipients: string[]

    constructor(mailTransport: SMTPTransportOptions, sender: string, recipients: string[]) {
        this._transporter = createTransport(mailTransport)
        this._sender = sender
        this._recipients = recipients
    }

    private createMailTemplate(correlationId: string, msg: string, ...args: any[]): SendMailOptions {
        return {
            from: this._sender,
            to: this._recipients,
            subject: 'New Trade Made By Robot!',
            text: `[correlationId: ${correlationId}]: ${msg} ${formatArgs(args)}`
        }
    }

    public async sendMessage(correlationId: string, msg: string, ...args: any[]): Promise<void> {
        const mailTemplate = this.createMailTemplate(correlationId, msg, ...args)
        try {
            this._logger.info('Sending message to trade alerts recipients...')
            await this._transporter.sendMail(mailTemplate)
            this._logger.info('Sent message successfully.')
        } catch (err) {
            this._logger.error(`Failed to send message: ${JSON.stringify(msg)}`, err)
        }
    }
}
