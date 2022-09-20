import rTracer from 'cls-rtracer'

import { RobotConfig, ProviderConfig } from "../../config";
import { Logger } from "../../logger";
import { PancakeSwapExchangeWrapper } from "../../robot/PancakeSwapExchangeWrapper";
import { ProviderWrapper } from "../../robot/ProviderWrapper";
import { Robot, RobotState } from "../../robot/Robot";
import { TradeAlertsManager } from "../../trade-alerts";
import { ITradeStateRepo } from "../db/services/TradeStateRepo";
import { ITransactionsRepo } from "../db/services/TransactionsRepo";


interface IResumeTradeService {
    resumeTrade(id: string): Promise<void>
    resumeActiveTrades(): Promise<void>
}

export class ResumeTradesService implements IResumeTradeService {
    private readonly _logger = new Logger(ResumeTradesService.name)

    constructor(
        private readonly _robotConfig: RobotConfig,
        private readonly _providerConfig: ProviderConfig,
        private readonly _tradeStateRepo: ITradeStateRepo<RobotState>,
        private readonly _transactionsRepo: ITransactionsRepo,
        private readonly _alertsManager: TradeAlertsManager,
    ) { }

    //TODO: implement later
    public async resumeTrade(id: string) {

    }

    public async resumeActiveTrades() {
        const provider = new ProviderWrapper(this._providerConfig)
        if (!provider) {
            this._logger.error("There is no provider, it won't work with ganache because previous position won't be found")
            return
        }

        const activeTradesResult = await this._tradeStateRepo.findActiveTrades()
        if (!activeTradesResult.success) {
            this._logger.error("Failed to get active trades", activeTradesResult)
            return
        }

        const { result: activeTrades } = activeTradesResult
        if (!activeTrades.length) {
            this._logger.info("Didn't find any active trades")
            return
        }

        // TODO: we need to handle this promise some how to avoid unhandledRejections.
        //  I suggest in general to map all these promises into Promise.allSettled() and somehow handle the
        //  rejected ones (probably we would want to log something and also retry them).
        await Promise.allSettled(activeTrades.map(async activeTrade => {
            await rTracer.runWithId(async () => {
                const exchange = new PancakeSwapExchangeWrapper(provider)
                const robot = new Robot(exchange, provider, this._tradeStateRepo, this._transactionsRepo, this._alertsManager, this._robotConfig)
                await robot.resume(activeTrade)
            }, activeTrade.correlationId)
        }))
    }
}
