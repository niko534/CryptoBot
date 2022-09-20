import rTracer from 'cls-rtracer'
import { OperationOptions } from 'retry'
import promiseRetry from 'promise-retry'

import { NO_CORRELATION } from './constants'

export const getCid = (): string => (rTracer.id() || NO_CORRELATION) as string

export type RetryOptions = OperationOptions

export async function withRetry<ResolutionType>(run: () => Promise<ResolutionType>, options: RetryOptions): Promise<ResolutionType> {
    return promiseRetry<ResolutionType>(async (retry) => {
        try {
            return await run()
        } catch (e) {
            retry(e)
            throw e;
        }
    }, options)
}
