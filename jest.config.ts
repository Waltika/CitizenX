// jest.config.ts
export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'tsx', 'js'],
    testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)'],
    moduleNameMapper: {
        '^chrome$': '<rootDir>/src/__mocks__/chrome.ts'
    },
    setupFilesAfterEnv: ['<rootDir>/src/__mocks__/setup.ts'],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: 'tsconfig.json'
        }]
    }
};