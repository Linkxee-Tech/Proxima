from dataclasses import dataclass
from .registry import definition

@dataclass
class ConsentTool:
    name: str
    def status(self) -> dict:
        tool=definition(self.name); return {"name":tool.name,"label":tool.label,"scopes":list(tool.scopes),"configured":tool.configured()}
    def execute(self, action: str, parameters: dict) -> dict:
        return {"tool":self.name,"action":action,"parameters":parameters,"status":"queued"}
