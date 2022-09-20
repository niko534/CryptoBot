export interface TradeAlertsTransporter {
    sendMessage(correlationId: string, msg: string, ...args: any[]): Promise<void>
}
