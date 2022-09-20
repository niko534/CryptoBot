import { NextFunction, Request, Response } from 'express'

export function safeControllerWrapper(
    controller: (req: Request, res: Response, next: NextFunction) => Promise<void>
): (req: Request<any>, res: Response<any>, next: NextFunction) => Promise<void> {
    return async (req: Request<any>, res: Response<any>, next: NextFunction) => {
        try {
            await controller(req, res, next)
        } catch (error) {
            next(error)
        }
    }
}

