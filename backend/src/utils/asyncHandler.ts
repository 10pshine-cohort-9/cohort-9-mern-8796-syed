import type { RequestHandler } from 'express';

export function asyncHandler(handler: RequestHandler): RequestHandler {
    return (req, res, next) => {
        void Promise.resolve()
            .then(() => handler(req, res, next))
            .catch(next);
    };
}

export default asyncHandler;