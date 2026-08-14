import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import Flashcard from './Flashcard';

vi.mock('../ui/Button', () => ({
  default: ({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props}>{children}</button>
  )
}));

vi.mock('../ui/Badge', () => ({
  default: ({ children, ...props }) => <span {...props}>{children}</span>
}));

vi.mock('../ui/TopicChip', () => ({
  default: ({ type, ...props }) => <span {...props}>{type}</span>
}));

describe('Flashcard', () => {
  const card = {
    id: 1,
    question: 'What is force?',
    hint: 'A push or pull',
    ctype: 'question',
    method: 'RECALL',
    retention: 87,
    hasFile: false,
    fileName: null
  };

  it('renders the rating controls and sends FSRS ratings', () => {
    const onFeedback = vi.fn();

    render(<Flashcard card={card} onFeedback={onFeedback} topicName="Physics" showSkip={false} />);

    fireEvent.click(screen.getByRole('button', { name: /reveal \/ flip card/i }));
    fireEvent.click(screen.getByRole('button', { name: /again/i }));
    fireEvent.click(screen.getByRole('button', { name: /hard/i }));
    fireEvent.click(screen.getByRole('button', { name: /good/i }));
    fireEvent.click(screen.getByRole('button', { name: /easy/i }));

    expect(onFeedback).toHaveBeenNthCalledWith(1, 1, 1);
    expect(onFeedback).toHaveBeenNthCalledWith(2, 1, 2);
    expect(onFeedback).toHaveBeenNthCalledWith(3, 1, 3);
    expect(onFeedback).toHaveBeenNthCalledWith(4, 1, 4);
  });
});
