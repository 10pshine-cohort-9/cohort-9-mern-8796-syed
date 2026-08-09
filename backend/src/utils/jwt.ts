import jwt, { type JwtPayload } from 'jsonwebtoken';

import { env } from '../config/env';

export type AuthTokenPayload = JwtPayload & {
    readonly sub: string;
};

const AUTH_TOKEN_EXPIRY = '7d';

function isAuthTokenPayload(payload: string | JwtPayload): payload is AuthTokenPayload {
    return typeof payload !== 'string' && typeof payload.sub === 'string';
}

export function signAuthToken(userId: string): string {
    return jwt.sign({ sub: userId }, env.jwtSecret, {
        expiresIn: AUTH_TOKEN_EXPIRY,
    });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
    const payload = jwt.verify(token, env.jwtSecret);

    if (!isAuthTokenPayload(payload)) {
        throw new Error('Invalid authentication token payload');
    }

    return payload;
}
