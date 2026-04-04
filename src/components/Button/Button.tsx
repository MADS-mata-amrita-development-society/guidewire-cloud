import type { ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import type { ButtonProps as AriaButtonProps, ButtonRenderProps } from 'react-aria-components';

export interface ButtonProps extends Omit<AriaButtonProps, 'children' | 'className'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  children: ReactNode | ((renderProps: Omit<ButtonRenderProps, 'defaultChildren'>) => ReactNode);
  className?: string | ((renderProps: Omit<ButtonRenderProps, 'defaultClassName'>) => string);
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  isDisabled,
  ...props
}: ButtonProps) {
  const variantClass = `btn-${variant}`;
  const sizeClass = size !== 'md' ? `btn-${size}` : '';
  const fullClass = fullWidth ? 'btn-full' : '';

  return (
    <AriaButton
      className={(renderProps) => {
        const baseClass = `btn ${variantClass} ${sizeClass} ${fullClass}`;
        const computedClass = typeof className === 'function' ? className(renderProps) : className;
        
        return [
          baseClass,
          computedClass,
          renderProps.isHovered ? 'hover' : '',
          renderProps.isPressed ? 'active' : '',
          renderProps.isFocused ? 'focus-visible' : ''
        ].filter(Boolean).join(' ').trim();
      }}
      isDisabled={disabled || isDisabled || loading}
      {...props}
    >
      {(renderProps) => (
        <>
          {loading ? (
            <span className="spinner spinner-sm" style={{ borderTopColor: 'currentColor' }} />
          ) : icon ? (
            icon
          ) : null}
          {typeof children === 'function' ? children(renderProps) : children}
        </>
      )}
    </AriaButton>
  );
}
