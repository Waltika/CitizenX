export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'tsx', 'js'],
    testMatch: ['**/tests/**/*.(test|spec).(ts|tsx)'],
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.json'
        }
    }
};