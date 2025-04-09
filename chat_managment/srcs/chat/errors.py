from rest_framework.exceptions import APIException

class TokenExpiredException(APIException):
    status_code = 401
    default_detail = "User authentication token has expired. Please refresh the token."
    default_code = "token_expired"
    

class PrivateMessageError(Exception):
    """
    Raised when relation update is incoherent or invalid
    """
    def __init__(self, message):
        base_mess = f"Message status error : {message}"
        super(PrivateMessageError, self).__init__(base_mess)

class CannotMessageYourself(PrivateMessageError):
    """
    Raised when a user try to send itself a message
    """
    def __init__(self, status_str):
        super().__init__(f'You cannot message yourself this is ridiculous (or is it ?)')

class UnknownStatusError(PrivateMessageError):
    """
    Raised when a string can not be converted into a valid relation
    """
    def __init__(self, status_str):
        super().__init__(f'unable to convert {status_str} into a MessageStatus')

class AlreadySent(PrivateMessageError):
    def __init__(self):
        super().__init__(f'that message is already marked as sent leave it alone')

class AlreadyDelivered(PrivateMessageError):
    def __init__(self):
        super().__init__(f'that message is already marked as delivered please wait a bit and go touch some grass')

class AlreadyRead(PrivateMessageError):
    def __init__(self):
        super().__init__(f'that message is already marked as read what else do you want??')

