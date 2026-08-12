import { Schema, model, type HydratedDocument } from 'mongoose';

export type UserAttributes = {
    readonly email: string;
    readonly name: string;
    readonly password: string;
};

export type UserDocument = HydratedDocument<
    UserAttributes
>;

export type PublicUser = {
    readonly email: string;
    readonly id: string;
    readonly name: string;
};

const userSchema = new Schema<UserAttributes>(
    {
        email: {
            required: true,
            trim: true,
            type: String,
            unique: true,
            lowercase: true,
        },
        name: {
            required: true,
            trim: true,
            type: String,
        },
        password: {
            required: true,
            select: false,
            type: String,
        },
    },
    {
        timestamps: true,
    },
);

export const User = model<UserAttributes>('User', userSchema);

export default User;