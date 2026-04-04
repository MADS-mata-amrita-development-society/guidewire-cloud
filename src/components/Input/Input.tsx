import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import {
  TextField,
  Label,
  Input as AriaInput,
  TextArea as AriaTextArea,
  Text,
  Select as AriaSelect,
  Button as AriaButton,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem
} from 'react-aria-components';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: ReactNode;
  required?: boolean;
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
}

export function Input({
  label,
  error,
  helper,
  icon,
  required,
  className = '',
  id,
  onChange,
  value,
  ...props
}: InputProps) {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s/g, '-')}`;

  const handleChange = (val: string) => {
    if (onChange) {
      onChange({ target: { value: val } });
    }
  };

  return (
    <div className={`input-group ${className}`}>
      <TextField
        id={inputId}
        value={value}
        onChange={handleChange}
        isRequired={required}
        isInvalid={!!error}
      >
        {label && (
          <Label className="input-label">
            {label}
            {required && <span className="required">*</span>}
          </Label>
        )}
        {icon ? (
          <div className="input-with-icon">
            <span className="input-icon">{icon}</span>
            <AriaInput className={`input ${error ? 'input-error' : ''}`} {...props} />
          </div>
        ) : (
          <AriaInput className={`input ${error ? 'input-error' : ''}`} {...props} />
        )}
        {error && <Text slot="errorMessage" className="input-error-text">{error}</Text>}
        {helper && !error && <Text slot="description" className="input-helper">{helper}</Text>}
      </TextField>
    </div>
  );
}

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
}

export function Textarea({
  label,
  error,
  helper,
  required,
  className = '',
  id,
  onChange,
  value,
  ...props
}: TextareaProps) {
  const textareaId = id || `textarea-${label?.toLowerCase().replace(/\s/g, '-')}`;

  const handleChange = (val: string) => {
    if (onChange) {
      onChange({ target: { value: val } });
    }
  };

  return (
    <div className={`input-group ${className}`}>
      <TextField
        id={textareaId}
        value={value}
        onChange={handleChange}
        isRequired={required}
        isInvalid={!!error}
      >
        {label && (
          <Label className="input-label">
            {label}
            {required && <span className="required">*</span>}
          </Label>
        )}
        <AriaTextArea className={`input textarea ${error ? 'input-error' : ''}`} {...props} />
        {error && <Text slot="errorMessage" className="input-error-text">{error}</Text>}
        {helper && !error && <Text slot="description" className="input-helper">{helper}</Text>}
      </TextField>
    </div>
  );
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
}

export function Select({
  label,
  error,
  helper,
  required,
  options,
  placeholder,
  className = '',
  id,
  onChange,
  value,
}: SelectProps) {
  const selectId = id || `select-${label?.toLowerCase().replace(/\s/g, '-')}`;

  const handleSelectionChange = (val: import('react').Key | null) => {
    if (onChange && val !== null) {
      onChange({ target: { value: String(val) } });
    }
  };

  return (
    <div className={`input-group ${className}`}>
      <AriaSelect
        id={selectId}
        selectedKey={value}
        onSelectionChange={handleSelectionChange}
        isRequired={required}
        isInvalid={!!error}
      >
        {label && (
          <Label className="input-label">
            {label}
            {required && <span className="required">*</span>}
          </Label>
        )}
        <AriaButton className={`input select ${error ? 'input-error' : ''}`}>
          <SelectValue>
            {({ selectedText }) => selectedText || placeholder || 'Select an option'}
          </SelectValue>
        </AriaButton>
        {error && <Text slot="errorMessage" className="input-error-text">{error}</Text>}
        {helper && !error && <Text slot="description" className="input-helper">{helper}</Text>}
        <Popover className="popover">
          <ListBox className="listbox">
            {options.map((opt) => (
              <ListBoxItem key={opt.value} id={opt.value} className="listbox-item">
                {opt.label}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </AriaSelect>
    </div>
  );
}
