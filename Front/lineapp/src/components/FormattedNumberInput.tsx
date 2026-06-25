import type { InputHTMLAttributes } from "react";
import { formatIntegerWithCommas, parseIntegerInput } from "../utils/formatIntegerInput";

type FormattedNumberInputProps = Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type" | "inputMode"
> & {
    value: string;
    onChange: (rawValue: string) => void;
};

export default function FormattedNumberInput({
    value,
    onChange,
    ...props
}: FormattedNumberInputProps) {
    return (
        <input
            {...props}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={formatIntegerWithCommas(value)}
            onChange={(event) => onChange(parseIntegerInput(event.target.value))}
        />
    );
}
