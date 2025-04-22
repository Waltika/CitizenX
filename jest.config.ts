// jest.config.ts
export default {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^helia$': '<rootDir>/__mocks__/helia.js',
        '^@libp2p/websockets$': '<rootDir>/__mocks__/@libp2p/websockets.js',
        '^@libp2p/webrtc$': '<rootDir>/__mocks__/@libp2p/webrtc.js',
        '^@libp2p/circuit-relay-v2$': '<rootDir>/__mocks__/@libp2p/circuit-relay-v2.js',
        '^@chainsafe/libp2p-gossipsub$': '<rootDir>/__mocks__/@chainsafe/libp2p-gossipsub.js',
        '^@libp2p/bootstrap$': '<rootDir>/__mocks__/@libp2p/bootstrap.js',
        '^@libp2p/identify$': '<rootDir>/__mocks__/@libp2p/identify.js',
        '^@libp2p/interface$': '<rootDir>/__mocks__/@libp2p/interface.js',
        '^@orbitdb/core$': '<rootDir>/__mocks__/@orbitdb/core.js',
}
,
setupFilesAfterEnv: ['@testing-library/jest-dom'],
}
;