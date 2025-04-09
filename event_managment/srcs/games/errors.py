from events.errors import *

class GameError(EventError):
    """
    Base class for all game errors.
    """
    base_message = 'Game error: '
    message = '?'
    
class NoGoalError(GameError):
    """
    Raised when a goal is scored in a game that has not yet begun.
    """
    message = 'No goal can be scored in a game that has not yet begun or has yet be ended.'

class NotInGameError(GameError):
    """
    Raised when a user attempts to score a goal in a game they are not in.
    """
    message = 'You can not score a goal in a game you are not in.'