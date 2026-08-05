import * as React from "react"
import { Input } from "./input"

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number;
  onChange?: (e: any) => void;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("");

    React.useEffect(() => {
      if (value !== undefined && value !== null) {
        const formatted = new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);
        setDisplayValue(formatted);
      } else {
        setDisplayValue("");
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const digits = rawValue.replace(/\D/g, '');
      
      let numberValue = 0;
      if (digits) {
        numberValue = parseInt(digits, 10) / 100;
      }
      
      onChange?.({
        target: {
          name: props.name,
          value: numberValue,
          type: 'number'
        }
      });
    };

    return (
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        ref={ref}
      />
    )
  }
)
CurrencyInput.displayName = "CurrencyInput"
