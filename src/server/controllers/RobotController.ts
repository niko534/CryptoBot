import { NextFunction, Request, Response } from 'express'
import { ProviderConfig, RobotConfig } from '../../config';
import { Logger } from '../../logger';
import { RobotState } from '../../robot/Robot';
import { TradeAlertsManager } from '../../trade-alerts';
import { RobotRunnerService } from '../db/services/RobotRunnerService';
import { ITradeStateRepo } from '../db/services/TradeStateRepo';
import { ITransactionsRepo } from '../db/services/TransactionsRepo';
import { TipData } from '../utils';


export class RobotController {
    private readonly _logger = new Logger(RobotController.name)

    constructor(
        private readonly _robotConfig: RobotConfig,
        private readonly _providerConfig: ProviderConfig,
        private readonly _tradeStateRepo: ITradeStateRepo<RobotState>,
        private readonly _transactionsRepo: ITransactionsRepo,
        private readonly _alertsManager: TradeAlertsManager,
    ) { }

    public async runRobot(req: Request<any>, res: Response<any>, next: NextFunction) {
        const tipData = req.body as TipData
        this._logger.info("Received tip data", tipData)
        const robotRunnerService = new RobotRunnerService(this._robotConfig, this._providerConfig, this._tradeStateRepo, this._transactionsRepo, this._alertsManager)
        robotRunnerService.runRobot(tipData)
        res.sendStatus(200)
        next()
    }
}
