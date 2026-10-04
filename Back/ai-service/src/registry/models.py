"""โมเดลของรายการใน API Registry"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ToolParameter(BaseModel):
    type: Literal["string", "number", "integer", "boolean"] = "string"
    description: str = ""
    required: bool = False


class RegistryEntry(BaseModel):
    id: str
    description: str
    keywords: list[str] = Field(default_factory=list)
    permission: Literal["read", "read_own", "parse_only"] = "read"
    method: Literal["GET", "POST", "LOCAL"] = "GET"
    path: str | None = None
    executor: Literal["http", "local"] = "http"
    handler: str | None = None
    parameters: dict[str, ToolParameter] = Field(default_factory=dict)

    def openai_tool(self) -> dict[str, Any]:
        props: dict[str, Any] = {}
        required: list[str] = []
        for name, param in self.parameters.items():
            props[name] = {
                "type": param.type,
                "description": param.description,
            }
            if param.required:
                required.append(name)
        return {
            "type": "function",
            "function": {
                "name": self.id,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": props,
                    "required": required,
                },
            },
        }
