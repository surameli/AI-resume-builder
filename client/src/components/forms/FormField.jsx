/**
 * FormField — wraps a label + input + error message.
 * Designed to be used with react-hook-form's register() and formState.errors.
 */

export const FormField = ({
  label,
  name,
  type = 'text',
  placeholder,
  register,
  error,
  hint,
  required = false,
  disabled = false,
  autoComplete,
  children, // Allows custom input elements (e.g. select, textarea)
  className = '',
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}

      {children ?? (
        <input
          id={name}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
          className={`form-input ${error ? 'form-input-error' : ''}`}
          {...(register ? register(name) : {})}
        />
      )}

      {error && (
        <p id={`${name}-error`} className="form-error" role="alert">
          {error.message}
        </p>
      )}

      {hint && !error && (
        <p id={`${name}-hint`} className="form-hint">
          {hint}
        </p>
      )}
    </div>
  );
};

export default FormField;
