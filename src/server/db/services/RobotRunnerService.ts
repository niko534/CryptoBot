import { RobotConfig, ProviderConfig } from "../../../config";
import { Logger } from "../../../logger";
import { PancakeSwapExchangeWrapper } from "../../../robot/PancakeSwapExchangeWrapper";
import { ProviderWrapper } from "../../../robot/ProviderWrapper";
import { Robot, RobotState } from "../../../robot/Robot";
import { TradeAlertsManager } from "../../../trade-alerts";
import { TipData } from "../../utils";
import { ITradeStateRepo } from "./TradeStateRepo";
import { ITransactionsRepo } from "./TransactionsRepo";
import { getCid } from '../../../common'

export interface IRobotRunnerService {
    runRobot(tipData: TipData): Promise<void>
}

export class RobotRunnerService {
    private readonly _logger = new Logger(RobotRunnerService.name)

    constructor(
        private readonly _robotConfig: RobotConfig,
        private readonly _providerConfig: ProviderConfig,
        private readonly _tradeStateRepo: ITradeStateRepo<RobotState>,
        private readonly _transactionsRepo: ITransactionsRepo,
        private readonly _alertsManager: TradeAlertsManager,
    ) {}

    public async runRobot(tipData: TipData) {
        try {
            const provider = new ProviderWrapper(this._providerConfig)
            const exchange = new PancakeSwapExchangeWrapper(provider)
            const robot = new Robot(exchange, provider, this._tradeStateRepo, this._transactionsRepo, this._alertsManager, this._robotConfig)
            this._logger.info("Robot started, processing tip data", tipData)
            await robot.go(tipData)
        } catch (error) {
            this._logger.error("An error was thrown while robot processed the tip data", error)
            this._alertsManager.sendTradeAlert(getCid(), `An error was thrown while robot processed the tip data ${error}`)
        }
    }
}
