import { render, screen, fireEvent } from '@testing-library/react';
import GroupCard from '@/components/GroupCard';

describe('GroupCard', () => {
    const mockGroup = {
        id: '1',
        name: 'Trip to Paris',
        description: 'Summer vacation expenses',
        created_by: 'user1',
        created_at: '2024-01-15T10:00:00Z',
    };

    const mockOnClick = jest.fn();

    beforeEach(() => {
        mockOnClick.mockClear();
    });

    it('renders group name and description', () => {
        render(<GroupCard group={mockGroup} onClick={mockOnClick} />);

        expect(screen.getByText('Trip to Paris')).toBeInTheDocument();
        expect(screen.getByText('Summer vacation expenses')).toBeInTheDocument();
    });

    it('renders correct emoji for trip group', () => {
        render(<GroupCard group={mockGroup} onClick={mockOnClick} />);

        expect(screen.getByText('✈️')).toBeInTheDocument();
    });

    it('calls onClick when card is clicked', () => {
        render(<GroupCard group={mockGroup} onClick={mockOnClick} />);

        const card = screen.getByRole('button');
        fireEvent.click(card);

        expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('displays formatted creation date', () => {
        render(<GroupCard group={mockGroup} onClick={mockOnClick} />);

        expect(screen.getByText(/Created Jan 15, 2024/i)).toBeInTheDocument();
    });

    it('handles groups without description', () => {
        const groupNoDesc = { ...mockGroup, description: null };
        render(<GroupCard group={groupNoDesc} onClick={mockOnClick} />);

        expect(screen.getByText('Trip to Paris')).toBeInTheDocument();
        expect(screen.queryByText('Summer vacation expenses')).not.toBeInTheDocument();
    });

    it('shows house emoji for rent/home groups', () => {
        const homeGroup = { ...mockGroup, name: 'Home Expenses' };
        render(<GroupCard group={homeGroup} onClick={mockOnClick} />);

        expect(screen.getByText('🏠')).toBeInTheDocument();
    });

    it('shows food emoji for food groups', () => {
        const foodGroup = { ...mockGroup, name: 'Dinner Club' };
        render(<GroupCard group={foodGroup} onClick={mockOnClick} />);

        expect(screen.getByText('🍽️')).toBeInTheDocument();
    });
});
