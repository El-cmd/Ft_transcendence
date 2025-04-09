from django.db import models
from enum import Enum
from typing_extensions import Self
from .errors import *

from django.contrib.auth.models import User
from channels.db import database_sync_to_async



class PrivateMessage(models.Model):
    sender = models.PositiveIntegerField()
    recipient = models.PositiveIntegerField()
    content = models.TextField()
    timestamp = models.DateTimeField() # auto_now_add=True
    message_type = models.CharField(max_length=20, default="text") # regular message, game invitation or tournament notification
    is_active = models.BooleanField(default=False) # determines whether the game invitation is still active or not
    # status = models.CharField(choices=MessageStatus.choices(), max_length=10, default = MessageStatus.SENT) # sent, delivered, read 
    should_send = models.BooleanField(default=True) # if false, means that the recipient blocked the sender at the time this message was sent -> don't broadcast it to the recipient     

    def __str__(self):
        return f'{self.sender} to {self.recipient} : {self.content}. Should send : {self.should_send}. Type = {self.message_type}. Is active : {self.is_active}'
    
    def get_message_info(self) -> dict : # is then sent as json object to the front 
        return { 
            "sender" : self.sender,
            "recipient" : self.recipient,
            "content" : self.content,
            "timestamp" : self.timestamp.isoformat(),
            "message_type": self.message_type
        } # "status":self.status.value,

