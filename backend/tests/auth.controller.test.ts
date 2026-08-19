import 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import { Types } from 'mongoose';
import sinon from 'sinon';
import app from '../src/app';
import User, { type UserDocument } from '../src/models/User';
import TokenRevocation from '../src/models/TokenRevocation';
import bcrypt from 'bcryptjs';

describe('Auth Controller & Routes (POST /api/auth/*)', () => {
    const validUserId = new Types.ObjectId('507f1f77bcf86cd799439011');

    afterEach(() => {
        sinon.restore();
    });

    describe('POST /api/auth/register', () => {
        it('should return 201 created on successful registration', async () => {
            const mockUser = {
                _id: validUserId,
                id: validUserId.toString(),
                email: 'test@example.com',
                name: 'Test User',
            };

            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves(null),
            } as unknown as ReturnType<typeof User.findOne>);

            const createStub = sinon.stub(User, 'create') as unknown as sinon.SinonStub<[unknown], Promise<UserDocument>>;
            createStub.resolves(mockUser as unknown as UserDocument);

            let res;
            try {
                res = await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: 'Test User',
                        email: 'test@example.com',
                        password: 'password123',
                    });
            } catch (err: unknown) {
                expect.fail(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
            }

            expect(res.status).to.equal(201);
            expect(res.body.success).to.be.true;
            expect(res.body.data.user.email).to.equal('test@example.com');
            expect(res.body.data).to.have.property('token');
        });

        it('should return 400 bad request if request body is invalid or missing required fields', async () => {
            let res;
            try {
                res = await request(app)
                    .post('/api/auth/register')
                    .send({
                        email: 'test@example.com',
                    });
            } catch (err: unknown) {
                expect.fail(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
            }

            expect(res.status).to.equal(400);
            expect(res.body.success).to.be.false;
        });

        it('should return 409 conflict if email is already in use', async () => {
            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves({ _id: validUserId }),
            } as unknown as ReturnType<typeof User.findOne>);

            let res;
            try {
                res = await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: 'Test User',
                        email: 'existing@example.com',
                        password: 'password123',
                    });
            } catch (err: unknown) {
                expect.fail(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
            }

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
                _id: validUserId,
                id: validUserId.toString(),
                email: 'test@example.com',
                name: 'Test User',
                password: hashedPassword,
            };

            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().resolves(mockUser),
            } as unknown as ReturnType<typeof User.findOne>);

            let res;
            try {
                res = await request(app)
                    .post('/api/auth/login')
                    .send({
                        email: 'test@example.com',
                        password: 'password123',
                    });
            } catch (err: unknown) {
                expect.fail(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
            }

            expect(res.status).to.equal(200);
            expect(res.body.success).to.be.true;
            expect(res.body.data).to.have.property('token');
        });

        it('should return 401 unauthorized on wrong credentials', async () => {
            const hashedPassword = await bcrypt.hash('realpassword123', 10);
            const mockUser = {
                _id: validUserId,
                id: validUserId.toString(),
                email: 'test@example.com',
                name: 'Test User',
                password: hashedPassword,
            };

            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().resolves(mockUser),
            } as unknown as ReturnType<typeof User.findOne>);

            let res;
            try {
                res = await request(app)
                    .post('/api/auth/login')
                    .send({
                        email: 'test@example.com',
                        password: 'wrongpassword',
                    });
            } catch (err: unknown) {
                expect.fail(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
            }

            expect(res.status).to.equal(401);
            expect(res.body.message).to.equal('Invalid email or password');
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return 401 unauthorized when Authorization header is missing', async () => {
            let res;
            try {
                res = await request(app).get('/api/auth/me');
            } catch (err: unknown) {
                expect.fail(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
            }
            expect(res.status).to.equal(401);
        });

        it('should return authenticated user profile when valid bearer token is provided', async () => {
            const mockUser = {
                _id: validUserId,
                id: validUserId.toString(),
                email: 'test@example.com',
                name: 'Test User',
            };

            // Register first to get valid JWT signed with actual secret
            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves(null),
            } as unknown as ReturnType<typeof User.findOne>);
            
            const createStub = sinon.stub(User, 'create') as unknown as sinon.SinonStub<[unknown], Promise<UserDocument>>;
            createStub.resolves(mockUser as unknown as UserDocument);

            let regRes;
            try {
                regRes = await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: 'Test User',
                        email: 'test@example.com',
                        password: 'password123',
                    });
            } catch (err: unknown) {
                expect.fail(`Registration setup request failed: ${err instanceof Error ? err.message : String(err)}`);
            }

            const token = regRes.body.data.token;
            sinon.restore();

            sinon.stub(TokenRevocation, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves(null),
            } as unknown as ReturnType<typeof TokenRevocation.findOne>);

            sinon.stub(User, 'findById').resolves(mockUser as unknown as UserDocument);

            let res;
            try {
                res = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${token}`);
            } catch (err: unknown) {
                expect.fail(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
            }

            expect(res.status).to.equal(200);
            expect(res.body.data.user.email).to.equal('test@example.com');
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should perform logout when valid authorization header is supplied', async () => {
            const mockUser = {
                _id: validUserId,
                id: validUserId.toString(),
                email: 'test@example.com',
                name: 'Test User',
            };

            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves(null),
            } as unknown as ReturnType<typeof User.findOne>);
            
            const createStub = sinon.stub(User, 'create') as unknown as sinon.SinonStub<[unknown], Promise<UserDocument>>;
            createStub.resolves(mockUser as unknown as UserDocument);

            let regRes;
            try {
                regRes = await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: 'Test User',
                        email: 'test@example.com',
                        password: 'password123',
                    });
            } catch (err: unknown) {
                expect.fail(`Registration setup request failed: ${err instanceof Error ? err.message : String(err)}`);
            }

            const token = regRes.body.data.token;
            sinon.restore();

            sinon.stub(TokenRevocation, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves(null),
            } as unknown as ReturnType<typeof TokenRevocation.findOne>);
            sinon.stub(User, 'findById').resolves(mockUser as unknown as UserDocument);
            sinon.stub(TokenRevocation, 'findOneAndUpdate').returns({
                exec: sinon.stub().resolves({}),
            } as unknown as ReturnType<typeof TokenRevocation.findOneAndUpdate>);

            let res;
            try {
                res = await request(app)
                    .post('/api/auth/logout')
                    .set('Authorization', `Bearer ${token}`);
            } catch (err: unknown) {
                expect.fail(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
            }

            expect(res.status).to.equal(200);
            expect(res.body.message).to.equal('Logout successful');
        });
    });
});
