"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var bcrypt = require("bcrypt");
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function hashPassword(password) {
    return __awaiter(this, void 0, void 0, function () {
        var saltRounds;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    saltRounds = 10;
                    return [4 /*yield*/, bcrypt.hash(password, saltRounds)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function setupTestData() {
    return __awaiter(this, void 0, void 0, function () {
        var adminCount, hashedPassword, packageCount, admin, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 13, 14, 16]);
                    console.log('Setting up test data...');
                    return [4 /*yield*/, prisma.admin.count()];
                case 1:
                    adminCount = _a.sent();
                    if (!(adminCount === 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, hashPassword('password123')];
                case 2:
                    hashedPassword = _a.sent();
                    return [4 /*yield*/, prisma.admin.create({
                            data: {
                                name: 'Test Admin',
                                email: 'admin@test.com',
                                password: hashedPassword
                            }
                        })];
                case 3:
                    _a.sent();
                    console.log('Created test admin: admin@test.com / password123');
                    return [3 /*break*/, 5];
                case 4:
                    console.log('Admin already exists');
                    _a.label = 5;
                case 5: return [4 /*yield*/, prisma.package.count()];
                case 6:
                    packageCount = _a.sent();
                    if (!(packageCount === 0)) return [3 /*break*/, 11];
                    return [4 /*yield*/, prisma.admin.findFirst({
                            select: {
                                id: true
                            }
                        })];
                case 7:
                    admin = _a.sent();
                    if (!admin) return [3 /*break*/, 9];
                    return [4 /*yield*/, prisma.package.create({
                            data: {
                                name: 'Basic Package',
                                speed: 25,
                                price: 29.99,
                                durationDays: 30,
                                createdBy: admin.id
                            }
                        })];
                case 8:
                    _a.sent();
                    console.log('Created test package: Basic Package');
                    return [3 /*break*/, 10];
                case 9:
                    console.log('No admin found to create package with');
                    _a.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    console.log('Package already exists');
                    _a.label = 12;
                case 12:
                    console.log('Test data setup complete!');
                    return [3 /*break*/, 16];
                case 13:
                    error_1 = _a.sent();
                    console.error('Error setting up test data:', error_1);
                    return [3 /*break*/, 16];
                case 14: return [4 /*yield*/, prisma.$disconnect()];
                case 15:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 16: return [2 /*return*/];
            }
        });
    });
}
setupTestData();
