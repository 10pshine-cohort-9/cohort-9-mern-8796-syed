import type { RequestHandler } from 'express';

import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { getAuthenticatedUser, login, logout, register } from '../services/auth.service';

type RegisterRequestBody = {
    readonly email: string;
    readonly name: string;
    readonly password: string;
};

type LoginRequestBody = {
    readonly email: string;
    readonly password: string;
};

const registerHandler: RequestHandler<unknown, unknown, RegisterRequestBody> = async (req, res) => {
    const result = await register(req.body);

    return sendSuccess(res, 201, 'Registration successful', result);
};

const loginHandler: RequestHandler<unknown, unknown, LoginRequestBody> = async (req, res) => {
    const result = await login(req.body);

    return sendSuccess(res, 200, 'Login successful', result);
};

const meHandler: RequestHandler = async (req, res) => {
    const userId = req.authenticatedUser?.userId;

    if (userId === undefined) {
        throw new ApiError('Authentication required', 401);
    }

    const user = await getAuthenticatedUser(userId);

    return sendSuccess(res, 200, 'Authenticated user retrieved successfully', {
        user,
    });
};

const logoutHandler: RequestHandler = async (req, res) => {
    const userId = req.authenticatedUser?.userId;
    const tokenId = req.authenticatedUser?.tokenId;
    const expiresAt = req.authenticatedUser?.expiresAt;

    if (userId === undefined || tokenId === undefined) {
        throw new ApiError('Authentication required', 401);
    }

    const result = await logout(userId, tokenId, expiresAt);

    return sendSuccess(res, 200, 'Logout successful', result);
};

export const registerUser = asyncHandler(registerHandler);
export const loginUser = asyncHandler(loginHandler);
export const logoutUser = asyncHandler(logoutHandler);
export const getAuthenticatedUserController = asyncHandler(meHandler);
