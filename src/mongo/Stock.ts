import mongoose from 'mongoose';
import { listType } from '../types';
const { Schema, model } = mongoose;

const BalanceSchema = new Schema({
    year: { type: Number, required: true },
    quarter: { type: Number },
    totalAssets: { type: Number },
    totalLiabilities: { type: Number },
    totalEquity: { type: Number },
}, { _id: false });

// Schema for IncomeInterface
const IncomeSchema = new Schema({
    year: { type: Number, required: true },
    totalRevenue: { type: Number },
    NICS: { type: Number }, // Net Income Common Stockholders
}, { _id: false });

// Schema for FinancialInterface
const FinancialSchema = new Schema({
    balance: {
        annual: [BalanceSchema],
        quarterly: [BalanceSchema],
    },
    income: [IncomeSchema],
    marketCap: { type: Number, require: false },
}, { _id: false });

// Schema for ComputedInterface (assuming structure)
const ComputedSchema = new Schema({
    income: {
        avgPercentage: Number,
        annualPercentages: [Number],
    },
    financial: {
        eligible: {
            annual: Boolean,
            quarterly: Boolean,
        }
    }
}, { _id: false });

// Schema for StockInterface
const StockSchema = new Schema({
    name: { type: String, required: true, unique: true },
    country: { type: String, default: null },
    sector: { type: String, default: null },
    financials: { type: FinancialSchema, default: null },
    computed: { type: ComputedSchema, default: null },
    list: { type: [String], enum: Object.values(listType), required: true },
}, { timestamps: true });

const Stock = model('Stock', StockSchema, 'stocks');
export default Stock;