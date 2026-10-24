import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tooltip } from '../Tooltip';

describe('Tooltip', () => {
  it('renders children correctly', () => {
    render(
      <Tooltip content="Helper text">
        <button type="button">Hover me</button>
      </Tooltip>
    );

    expect(screen.getByText('Hover me')).toBeDefined();
    expect(screen.getByText('Helper text')).toBeDefined();
  });

  it('renders tooltip with role and styling classes', () => {
    render(
      <Tooltip content="Important info">
        <span>Trigger</span>
      </Tooltip>
    );

    const tooltipEl = screen.getByRole('tooltip');
    expect(tooltipEl.textContent).toContain('Important info');
    expect(tooltipEl.className).toContain('absolute');
    expect(tooltipEl.className).toContain('bg-slate-700');
  });

  it('renders children directly when content is empty', () => {
    render(
      <Tooltip content="">
        <span>Only child</span>
      </Tooltip>
    );

    expect(screen.getByText('Only child')).toBeDefined();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
