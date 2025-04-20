import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HistoryList } from '../List';

describe('HistoryList', () => {
    test('renders visit history', async () => {
        render(<HistoryList />);
        expect(screen.getByText('Visit History')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('No visits recorded.')).toBeInTheDocument();
        });
    });

    test('displays no visits message when empty', async () => {
        render(<HistoryList />);
        await waitFor(() => {
            expect(screen.getByText('No visits recorded.')).toBeInTheDocument();
        });
    });
});