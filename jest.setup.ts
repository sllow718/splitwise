import '@testing-library/jest-dom';

declare global {
    namespace jest {
        interface Matchers<R> {
            toBeInTheDocument(): R;
            toHaveTextContent(text: string | RegExp): R;
            toHaveAttribute(attr: string, value?: string): R;
            toBeVisible(): R;
            toBeDisabled(): R;
            toBeEnabled(): R;
            toHaveClass(...classNames: string[]): R;
            toHaveStyle(style: Record<string, unknown>): R;
            toHaveFocus(): R;
            toContainElement(element: HTMLElement | null): R;
            toBeEmptyDOMElement(): R;
        }
    }
}
