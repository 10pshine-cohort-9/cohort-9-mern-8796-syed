import type { Request, Response } from 'express';

import { sendSuccess } from '../utils/ApiResponse';

type HealthResponse = {
    readonly status: 'ok';
    readonly uptime: number;
};

export function getHealthStatus(_req: Request, res: Response): Response {
    return sendSuccess<HealthResponse>(res, 200, 'Server is healthy', {
        status: 'ok',
        uptime: process.uptime(),
    });
}