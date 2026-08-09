import type { ParsedQs } from 'qs';
import type { ParamsDictionary, RequestHandler } from 'express-serve-static-core';

export function asyncHandler<
    P extends ParamsDictionary = ParamsDictionary,
    ResBody = unknown,
    ReqBody = unknown,
    ReqQuery = ParsedQs,
    LocalsObj extends Record<string, unknown> = Record<string, unknown>,
>(handler: RequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj>): RequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj> {
    return ((req, res, next) => {
        void Promise.resolve()
            .then(() => handler(req, res, next))
            .catch(next);
    }) as RequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj>;
}

export default asyncHandler;