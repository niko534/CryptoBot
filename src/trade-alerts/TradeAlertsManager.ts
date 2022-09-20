import { TradeAlertsTransporter } from './types'

export class TradeAlertsManager {
    private readonly _transporters: TradeAlertsTransporter[]

    constructor(transporters: TradeAlertsTransporter[]) {
        this._transporters = transporters
    }

    public async sendTradeAlert(correlationId: string, msg: string, ...args: any[]): Promise<void> {
        await Promise.allSettled(
            this._transporters.map(transporter => transporter.sendMessage(correlationId, msg, ...args)),
        )
    }
}
