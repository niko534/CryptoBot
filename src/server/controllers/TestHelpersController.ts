import { Request, Response, NextFunction } from 'express';
import rTracer from 'cls-rtracer'

import { ProviderConfig, RobotConfig } from '../../config';
import { Logger } from '../../logger';
import { PancakeSwapExchangeWrapper } from '../../robot/PancakeSwapExchangeWrapper';
import { ProviderWrapper } from '../../robot/ProviderWrapper';
import { Robot, RobotState } from '../../robot/Robot';
import { TradeAlertsManager } from '../../trade-alerts';
import { ITradeStateRepo } from '../db/services/TradeStateRepo';
import { ITransactionsRepo } from '../db/services/TransactionsRepo';
import { TipData } from '../utils';

export class TestHelpersController {
    private readonly _logger = new Logger(TestHelpersController.name)
    private _previousProvider: ProviderWrapper | null = null

    constructor(
        private readonly _robotConfig: RobotConfig,
        private readonly _providerConfig: ProviderConfig,
        private readonly _tradeStateRepo: ITradeStateRepo<RobotState>,
        private readonly _transactionsRepo: ITransactionsRepo,
        private readonly _alertsManager: TradeAlertsManager,
    ) { }

    public async onDataReceivedDev(req: Request<any>, res: Response<any>, next: NextFunction) {
        const tipData = req.body as TipData
        if (!tipData) {
            res.sendStatus(400).send("Please provide tip data for dev endpoint")
            next()
        }

        this._logger.info(`Received tip data`, tipData)
        this.handleDataInTestMode(tipData)
        res.sendStatus(200)
        next()
    }

    public async onTestResume(req: Request<any>, res: Response<any>, next: NextFunction) {
        this._logger.info(`Resuming trades`)
        this.resume()
        res.sendStatus(200)
        next()
    }

    public async dropOldTrades(req: Request<any>, res: Response<any>, next: NextFunction) {
        this._logger.info("Trying to delete old trades")
        const result = await this._tradeStateRepo.dropAllDocuments()
        if (!result.success) {
            this._logger.error("Failed to delete old trades", result.error)
            res.sendStatus(500).send(result.error)
        } else {
            this._logger.info("Old trades successfully deleted")
            res.sendStatus(200)
        }

        next()
    }

    private handleDataInTestMode(tipData: TipData) {
        this._previousProvider = new ProviderWrapper(this._providerConfig)
        const exchange = new PancakeSwapExchangeWrapper(this._previousProvider)
        const robot = new Robot(exchange, this._previousProvider, this._tradeStateRepo, this._transactionsRepo, this._alertsManager, this._robotConfig)
        robot.go(tipData).catch(e => {
            this._logger.error("An error was thrown while robot processed the tip data", e)
        })
        this._logger.info("Robot started, processing tip data")
    }

    private async resume() {
        const provider = this._previousProvider
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
            this._logger.info("Didn't find any active trades, exiting")
            return
        }

        await Promise.allSettled(activeTrades.map(async activeTrade => {
            await rTracer.runWithId(async () => {
                const exchange = new PancakeSwapExchangeWrapper(provider)
                const robot = new Robot(exchange, provider, this._tradeStateRepo, this._transactionsRepo, this._alertsManager, this._robotConfig)
                await robot.resume(activeTrade)
            }, activeTrade.correlationId)
        }))
    }
}
