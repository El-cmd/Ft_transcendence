
class VeryWeirdError(Exception):
    base_message = 'Very weird error No idea how you got here'
    message = 'A very weird error occured'
    
    def __init__(self):
        super().__init__(f'{self.base_message}: {self.message}')



class EventError(Exception):
    base_message = 'Event error'
    message = 'An error occured with the event'
    
    def __init__(self):
        super().__init__(f'{self.base_message}: {self.message}')
     
class NotInAnEventError(EventError):
    message = 'You are not in any event'
        
class NotInvitedError(EventError):
    message = 'Not invited to this event'
    
class EventHasBegin(EventError):
    message = 'Event has aready begin, you can not join or unjoin it anymore'

class EventHasNotBegin(EventError):
    message = 'Event has not begin yet'
    
class EventOverError(EventError):
    message = 'Event is already over'

class EventNotOverError(EventError):    
    message = 'Event is not over'

class EventFullError(EventError):
    message = 'Event is full, you can not join it anymore'

class NotPublicNotInvitedError(EventError):
    message = 'Event is not public and you are not invited'

class CanNotInviteAlreadyInvitedPlayerError(EventError):
    message = 'Player is already invited or already a player'
    
class NotAPlayer(EventError):
    message = 'You are not a player'

class NotAPlayerCanNotUnjoinError(EventError):
    message = 'You are not a player, you can not unjoin the event'


class PlayerCanNotJoinError(EventError):
    message = 'You are already a player, you can not join the event'


class AbastractEvent(EventError):
    message = 'This event seems to be neither a Game nor a tournament, it should not exist though'

class AlreadyLaunchedError(EventError):
    message = 'Event is already launched'
        
class NotEnoughPlayersError(EventError):
    message = 'Not enough players to launch the event'
    
class CanNotEndIfHasNotBeginError(EventError):
    message = 'Can not end an event that has not begin'
    
class YouCanNotSubscribeToMoreThanOneWaitingEventError(EventError):
    message = 'You can not subscribe to more than one waiting event; unsubrscribe or end the other one first'