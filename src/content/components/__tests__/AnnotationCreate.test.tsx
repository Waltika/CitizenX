import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnnotationCreate } from '../AnnotationCreate';
import { annotationService } from '../../../background/services/annotations';

// Mock @pinata/sdk
jest.mock('@pinata/sdk', () => {
    return jest.fn().mockImplementation(() => ({
        pinJSONToIPFS: jest.fn().mockResolvedValue({ IpfsHash: 'QmTestHash' })
    }));
});

// Mock annotationService
jest.mock('../../../background/services/annotations', () => ({
    annotationService: {
        addAnnotation: jest.fn().mockResolvedValue(undefined)
    }
}));

describe('AnnotationCreate', () => {
    const mockUrl = 'https://www.example.com';
    const mockUserId = 'test-user';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders annotation form and creates annotation', async () => {
        const mockAddAnnotation = jest.spyOn(annotationService, 'addAnnotation');
        render(<AnnotationCreate url={mockUrl} userId={mockUserId} />);
        expect(screen.getByPlaceholderText('Enter your annotation')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Add Annotation/i })).toBeInTheDocument();

        const textarea = screen.getByPlaceholderText('Enter your annotation');
        const addButton = screen.getByRole('button', { name: /Add Annotation/i });
        fireEvent.change(textarea, { target: { value: 'Test annotation' } });
        fireEvent.click(addButton);

        await waitFor(() => {
            expect(mockAddAnnotation).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: mockUrl,
                    text: 'Test annotation',
                    userId: mockUserId
                })
            );
        });
    });
});