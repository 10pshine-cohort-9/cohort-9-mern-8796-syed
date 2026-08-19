import 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import sinon from 'sinon';
import app from '../src/app';
import User from '../src/models/User';
import TokenRevocation from '../src/models/TokenRevocation';
import bcrypt from 'bcryptjs';

describe('Auth Controller & Routes (POST /api/auth/*)', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('POST /api/auth/register', () => {
        it('should return 201 created on successful registration', async () => {
            const mockUser = {
                _id: { toString: () => '507f1f77bcf86cd799439011' },
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                name: 'Test User',
            };

            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves(null),
            } as any);

            sinon.stub(User, 'create').resolves(mockUser as any);

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                });

            expect(res.status).to.equal(201);
            expect(res.body.success).to.be.true;
            expect(res.body.data.user.email).to.equal('test@example.com');
            expect(res.body.data).to.have.property('token');
        });

        it('should return 400 bad request if request body is invalid or missing required fields', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                });

            expect(res.status).to.equal(400);
            expect(res.body.success).to.be.false;
        });

        it('should return 409 conflict if email is already in use', async () => {
            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves({ _id: '507f1f77bcf86cd799439011' }),
            } as any);

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'existing@example.com',
                    password: 'password123',
                });

            expect(res.status).to.equal(409);
            expect(res.body).to.deep.equal({
                success: false,
                message: 'Email is already registered',
            });
        });
    });

    describe('POST /api/auth/login', () => {
        it('should return 200 OK with token on successful login', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            const mockUser = {
                _id: { toString: () => '507f1f77bcf86cd799439011' },
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                name: 'Test User',
                password: hashedPassword,
            };

            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().resolves(mockUser),
            } as any);

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                });

            expect(res.status).to.equal(200);
            expect(res.body.success).to.be.true;
            expect(res.body.data).to.have.property('token');
        });

        it('should return 401 unauthorized on wrong credentials', async () => {
            const hashedPassword = await bcrypt.hash('realpassword123', 10);
            const mockUser = {
                _id: { toString: () => '507f1f77bcf86cd799439011' },
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                name: 'Test User',
                password: hashedPassword,
            };

            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().resolves(mockUser),
            } as any);

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrongpassword',
                });

            expect(res.status).to.equal(401);
            expect(res.body.message).to.equal('Invalid email or password');
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return 401 unauthorized when Authorization header is missing', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.status).to.equal(401);
        });

        it('should return authenticated user profile when valid bearer token is provided', async () => {
            const mockUser = {
                _id: { toString: () => '507f1f77bcf86cd799439011' },
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                name: 'Test User',
            };

            // Register first to get valid JWT signed with actual secret
            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves(null),
            } as any);
            sinon.stub(User, 'create').resolves(mockUser as any);

            const regRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                });

            const token = regRes.body.data.token;
            sinon.restore();

            sinon.stub(TokenRevocation, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves(null),
            } as any);

            sinon.stub(User, 'findById').resolves(mockUser as any);

            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).to.equal(200);
            expect(res.body.data.user.email).to.equal('test@example.com');
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should perform logout when valid authorization header is supplied', async () => {
            const mockUser = {
                _id: { toString: () => '507f1f77bcf86cd799439011' },
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                name: 'Test User',
            };

            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves(null),
            } as any);
            sinon.stub(User, 'create').resolves(mockUser as any);

            const regRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                });

            const token = regRes.body.data.token;
            sinon.restore();

            sinon.stub(TokenRevocation, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves(null),
            } as any);
            sinon.stub(User, 'findById').resolves(mockUser as any);
            sinon.stub(TokenRevocation, 'findOneAndUpdate').returns({
                exec: sinon.stub().resolves({}),
            } as any);

            const res = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).to.equal(200);
            expect(res.body.message).to.equal('Logout successful');
        });
    });
});
