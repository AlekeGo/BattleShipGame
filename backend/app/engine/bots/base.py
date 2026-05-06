from abc import ABC, abstractmethod


class Bot(ABC):
    @abstractmethod
    def choose_shot(self, state: dict) -> tuple[int, int]:
        """Return (row, col) for the next shot given the visible state."""
