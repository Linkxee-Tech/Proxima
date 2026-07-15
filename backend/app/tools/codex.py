from ..sandbox.manager import sandbox
def review_or_heal(script: str) -> dict:
    result=sandbox.execute(script); return {"ok":result.ok,"output":result.output}
