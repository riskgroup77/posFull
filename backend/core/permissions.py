from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsActiveUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'account_status', 'active') == 'active'
        )


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class IsAdminOrManager(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('admin', 'manager')
        )


class IsNotSellerOnlyWrite(BasePermission):
    """Seller can read warehouse; write requires manager/admin."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in ('admin', 'manager')
