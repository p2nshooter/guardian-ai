"""Entry point for `python -m src` — starts the Guardian Node agent."""
import asyncio
from src.node import main

if __name__ == "__main__":
    asyncio.run(main())
