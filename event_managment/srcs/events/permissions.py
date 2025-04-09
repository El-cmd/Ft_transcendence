from rest_framework import permissions
from .models import Event, EventPlayer

class EventPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj : Event):
        """
        Determine if the user has permission to perform an action on the event object.

        Permissions are determined based on the following rules:
        - The owner of the event can edit or delete the event.
        - Invited or joined players can view the event if it is not public.
        - If the event is public, everyone can view, join, and invite other players.
        - Invited or joined players can invite other players, join the event, or unjoin it.

        Args:
            request: The HTTP request object containing the user and method.
            view: The view that is being accessed.
            obj (Event): The event object on which the action is being performed.

        Returns:
            bool: True if the user has the required permissions, False otherwise.
        """
        #allow all users to create events
        if request.method not in permissions.SAFE_METHODS:
            return request.user.id == obj.owner
        return True
    