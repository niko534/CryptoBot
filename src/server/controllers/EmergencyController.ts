import { NextFunction, Request, Response } from 'express'
import { ProviderConfig, RobotConfig } from "../../config";
import { Logger } from "../../logger";
import { RobotState } from "../../robot/Robot";
import { TradeAlertsManager } from "../../trade-alerts";
import { ITradeStateRepo } from "../db/services/TradeStateRepo";
import { ITransactionsRepo } from "../db/services/TransactionsRepo";
import { ResumeTradesService } from "../services/ResumeTradesService";


export class EmergencyController {
    private readonly _logger = new Logger(EmergencyController.name)

    constructor(
        private readonly _robotConfig: RobotConfig,
        private readonly _providerConfig: ProviderConfig,
        private readonly _tradeStateRepo: ITradeStateRepo<RobotState>,
        private readonly _transactionsRepo: ITransactionsRepo,
        private readonly _alertsManager: TradeAlertsManager,
    ) {
    }

    public async resumeTrade(req: Request<any>, res: Response<any>, next: NextFunction) {
        const resumeTradeService = new ResumeTradesService(this._robotConfig, this._providerConfig, this._tradeStateRepo, this._transactionsRepo, this._alertsManager)

        const { id } = req.params
        if (!id) {
            this._logger.error("No id provided for trade resume")
            res.sendStatus(400).send("No id provided")
            next()
            return
        }

        this._logger.info(`Resuming trade with id ${id}`)
        resumeTradeService.resumeTrade(id)

        res.sendStatus(200)
        next()
    }
}
