import * as React from "react";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import type { SelectChangeEvent } from "@mui/material";

type DropdownItem = {
    value: string;
};

type DropdownProps = {
    label: string;
    data: DropdownItem[];
    value?: string;
    onValueChange?: (value: string) => void;
};

export default function Dropdown({ label, data, value: valueProp, onValueChange }: DropdownProps) {
    const [internal, setInternal] = React.useState("");
    const controlled = valueProp !== undefined;
    const value = controlled ? valueProp : internal;

    React.useEffect(() => {
        if (!controlled && data[0]?.value && !internal) {
            setInternal(data[0].value);
        }
    }, [controlled, data, internal]);

    const handleChange = (event: SelectChangeEvent) => {
        const next = event.target.value;
        if (!controlled) setInternal(next);
        onValueChange?.(next);
    };

    return (
        <FormControl
            sx={{
                m: 1,
                minWidth: 120,

                "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
                    backgroundColor: "var(--surface)",
                    transition: "0.2s",
                    boxShadow: "var(--shadow-soft)",
                    color: "var(--text)",
                    "& fieldset": {
                        borderColor: "var(--border)",
                    },
                    "&:hover fieldset": {
                        borderColor: "var(--primary)",
                    },
                    "&.Mui-focused": {
                        boxShadow: "var(--shadow-soft)",
                        "& fieldset": {
                            borderColor: "var(--primary)",
                        },
                    },
                },
                "& .MuiInputLabel-root": {
                    color: "var(--text-soft)",
                    fontWeight: 600,
                },
            }}
            size="small"
        >
            <InputLabel>{label}</InputLabel>
            <Select value={value} label={label} onChange={handleChange}>
                {data.map((item) => (
                    <MenuItem key={item.value} value={item.value}>
                        {item.value}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}