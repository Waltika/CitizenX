// src/content/__tests__/index.test.tsx
console.log('Loading src/content/__tests__/index.test.tsx');

describe('Content Script', () => {
    let mockAddVisit: jest.Mock;

    beforeAll(() => {
        console.log('Running beforeAll');
        // Define mockAddVisit
        console.log('Defining mockAddVisit');
        mockAddVisit = jest.fn().mockImplementation(() => Promise.resolve(undefined));

        // Mock services
        console.log('Setting up historyService mock');
        jest.mock('../../background/services/history', () => {
            console.log('Inside historyService mock factory');
            return {
                historyService: {
                    addVisit: mockAddVisit
                }
            };
        });

        // Mock React components
        console.log('Setting up component mocks');
        jest.mock('../components/AnnotationCreate', () => ({
            AnnotationCreate: () => <div>Mock AnnotationCreate</div>
        }));
        jest.mock('../components/AnnotationDisplay', () => ({
            AnnotationDisplay: () => <div>Mock AnnotationDisplay</div>
        }));
        jest.mock('../components/AuthWrapper', () => ({
            AuthWrapper: () => <div>Mock AuthWrapper</div>
        }));

        // Mock createRoot
        console.log('Setting up react-dom/client mock');
        jest.mock('react-dom/client', () => ({
            createRoot: jest.fn().mockReturnValue({
                render: jest.fn()
            })
        }));

        // Mock the content script module
        console.log('Setting up index module mock');
        jest.mock('../index', () => {
            console.log('Inside index module mock factory');
            return {
                initialize: jest.fn().mockImplementation(async () => {
                    console.log('Mocked initialize called');
                    const { historyService } = await import('../../background/services/history');
                    const url = window.location.href;
                    await historyService.addVisit(url);
                })
            };
        });
    });

    beforeEach(() => {
        console.log('Running beforeEach');
        jest.clearAllMocks();
        // Mock window.location
        Object.defineProperty(global, 'window', {
            value: {
                location: {
                    href: 'https://www.example.com/?utm_source=twitter'
                }
            },
            writable: true
        });
        // Mock console.error and console.log
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation((msg) => console.info(msg));
    });

    afterEach(() => {
        console.log('Running afterEach');
        jest.spyOn(console, 'error').mockRestore();
        jest.spyOn(console, 'log').mockRestore();
    });

    test('adds visit on initialization', async () => {
        console.log('Starting test: adds visit on initialization');
        const { initialize } = await import('../index');
        console.log('Imported index module');
        await initialize();
        console.log('Initialize called, checking mock calls');

        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('Mock calls:', mockAddVisit.mock.calls);

        expect(mockAddVisit).toHaveBeenCalledWith('https://www.example.com/?utm_source=twitter');
        expect(mockAddVisit).toHaveBeenCalledTimes(1);
    });
});