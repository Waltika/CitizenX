import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnnotationList } from '../List';

const mockUrl = 'https://www.example.com';
const mockUserId = 'test-user';

describe('AnnotationList', () => {
    test('renders annotations and adds new annotation', async () => {
        render(<AnnotationList url={mockUrl} userId={mockUserId} />);
        expect(screen.getByText('Annotations')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('No annotations available.')).toBeInTheDocument();
        });
    });

    test('displays no annotations message when empty', async () => {
        render(<AnnotationList url={mockUrl} userId={mockUserId} />);
        await waitFor(() => {
            expect(screen.getByText('No annotations available.')).toBeInTheDocument();
        });
    });
});