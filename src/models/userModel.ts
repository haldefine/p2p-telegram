import mongoose from 'mongoose';
import {Language} from "../translation";
import TelegramBot, {SendMessageOptions} from "node-telegram-bot-api";
import {ModulesType} from "../modules";

export type RoleType = "ADMIN" | "USER" | "INACCESSIBLE" | "REGISTRATION";
export const defaultRole: RoleType = "REGISTRATION"

export type RegistrationStatusType = "PENDING_REGISTRATION" | "PENDING_APPROVAL" | "APPROVED" | "DECLINED";
export const defaultRegistrationStatus: RegistrationStatusType = "PENDING_REGISTRATION"

interface ActionDto extends TelegramBot.Message {
    type?: TelegramBot.MessageType,
}
const ActionSchema = new mongoose.Schema({
    type: String,
    message_id: Number,
    chat: Object,
    from: Object,
    text: String,
    photo: Object,
    document: Object
})

interface MenuDto {
    message_id: number,
    text: string
    options?: SendMessageOptions;
}
const MenuSchema = new mongoose.Schema({
    message_id: Number,
    text: String,
    options: Object,
})

interface IConversation {
    id: string,
    interactionTime: number,
    data: Map<string, any>,
    actionsHistory: ActionDto[],
    menusHistory: MenuDto[],
    targetModule: ModulesType,
}

const ConversationSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        index: true,
    },
    interactionTime: {
        type: Number,
        required: true,
        default: Date.now()
    },
    data: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        required: true,
        default: new Map(),
    },
    actionsHistory: {
        type: [ActionSchema],
        default: [],
        required: true,
    },
    menusHistory: {
        type: [MenuSchema],
        default: [],
        required: true,
    },
    targetModule: {
        type: String,
        required: true
    }
});


interface IUser extends mongoose.Document {
    id: number,
    conversations: IConversation[],
    waitForInput: string,
    lang: Language,
    username: string,
    role: RoleType,
    registrationStatus: RegistrationStatusType
    assignedBots: string[]
}

const UserSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true,
        index: true,
    },
    conversations: {
        type: [ConversationSchema],
        required: true,
        default: [],
    },
    waitForInput: {
        type: String,
        default: '',
    },
    lang: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: false,
        default: '',
    },
    role: {
        type: String,
        required: true,
        default: defaultRole,
    },
    registrationStatus: {
        type: String,
        required: true,
        default: defaultRegistrationStatus,
    },
    assignedBots: {
        type: [String],
        required: true,
        default: []
    }
})


export { IUser, IConversation, ActionDto, MenuDto };
export default mongoose.model<IUser>('User', UserSchema);
