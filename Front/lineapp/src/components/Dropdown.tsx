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
};

export default function Dropdown({ label, data }: DropdownProps) {
    const [value, setValue] = React.useState("");

    const handleChange = (event: SelectChangeEvent) => {
        setValue(event.target.value);
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