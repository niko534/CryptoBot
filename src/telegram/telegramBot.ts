import { Telegraf } from 'telegraf'
import Promise from 'bluebird'

import data from './data.json'
import { config } from '../config'

const botConfig = config.mockTipDataTelegramBot
const bot = new Telegraf(botConfig.botToken)
const messages = (data as Array<any>).filter(x => x.content.text && x.content.text.text).map(x => x.content.text.text)

let shouldSendMessages = false

async function startTextSending(ctx: any) {
    shouldSendMessages = true
    for (let i = 0; i < messages.length && shouldSendMessages; i++) {
        await ctx.telegram.sendMessage(ctx.message.chat.id, messages[i])
        await Promise.delay(botConfig.msgIntervalInSec * 1000)
    }
}

bot.start((ctx) => {
    console.log('Starting to send messages.')
    startTextSending(ctx)
})

bot.command('stop', () => {
    console.log('Stopping messages.')
    shouldSendMessages = false
})

bot.command('myid', (ctx) => {
    ctx.telegram.sendMessage(ctx.message.chat.id, (ctx.message.chat.id).toString())
})

bot.launch().then(() => console.log('Telegram Bot is connected.'))

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
