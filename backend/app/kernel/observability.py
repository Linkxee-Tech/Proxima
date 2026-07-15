import logging
import json


logger = logging.getLogger("proxima")

def structured(event: str, **fields: object) -> None:
    logger.info(json.dumps({"event":event, **fields}, default=str))
