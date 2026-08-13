import type { RequestHandler } from 'express';

import { ApiError } from '../utils/ApiError';
import { getAuthenticatedUser, login, logout, register } from '../services/auth.service';
import { sendSuccess } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

type RegisterRequestBody = {
    readonly email: string;
    readonly name: string;
    readonly password: string;
};

type LoginRequestBody = {
    readonly email: string;
    readonly password: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateRegisterPayload(body: unknown): RegisterRequestBody {
    if (!isObject(body)) {
        throw new ApiError('Invalid request body', 400);
    }

    const { email, name, password } = body;

    if (typeof name !== 'string') {
        throw new ApiError('Invalid or missing name', 400);
    }

    if (typeof email !== 'string') {
        throw new ApiError('Invalid or missing email', 400);
    }

    if (typeof password !== 'string') {
        throw new ApiError('Invalid or missing password', 400);
    }

    return { email, name, password };
}

function validateLoginPayload(body: unknown): LoginRequestBody {
    if (!isObject(body)) {
        throw new ApiError('Invalid request body', 400);
    }

    const { email, password } = body;

    if (typeof email !== 'string') {
        throw new ApiError('Invalid or missing email', 400);
    }

    if (typeof password !== 'string') {
        throw new ApiError('Invalid or missing password', 400);
    }

    return { email, password };
}

const registerHandler: RequestHandler<unknown, unknown, RegisterRequestBody> = async (req, res) => {
    try {
        const payload = validateRegisterPayload(req.body);
        const result = await register(payload);

        return sendSuccess(res, 201, 'Registration successful', result);
    } catch (error: unknown) {
        throw error;
    }
};

const loginHandler: RequestHandler<unknown, unknown, LoginRequestBody> = async (req, res) => {
    try {
        const payload = validateLoginPayload(req.body);
        const result = await login(payload);

        return sendSuccess(res, 200, 'Login successful', result);
    } catch (error: unknown) {
        throw error;
    }
};

const meHandler: RequestHandler = async (req, res) => {
    const userId = req.authenticatedUser?.userId;

    if (userId === undefined) {
        throw new ApiError('Authentication required', 401);
    }

    try {
        const user = await getAuthenticatedUser(userId);

        return sendSuccess(res, 200, 'Authenticated user retrieved successfully', {
            user,
        });
    } catch (error: unknown) {
        throw error;
    }
};

const logoutHandler: RequestHandler = async (req, res) => {
    const userId = req.authenticatedUser?.userId;
    const tokenId = req.authenticatedUser?.tokenId;
    const expiresAt = req.authenticatedUser?.expiresAt;

    if (userId === undefined || tokenId === undefined) {
        throw new ApiError('Authentication required', 401);
    }

    try {
        const result = await logout(userId, tokenId, expiresAt);

        return sendSuccess(res, 200, 'Logout successful', result);
    } catch (error: unknown) {
        throw error;
    }
};

export const registerUser = asyncHandler(registerHandler);
export const loginUser = asyncHandler(loginHandler);
export const logoutUser = asyncHandler(logoutHandler);
export const getAuthenticatedUserController = asyncHandler(meHandler);