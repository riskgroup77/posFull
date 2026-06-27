from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    BootstrapView,
    CategoryViewSet,
    CustomerViewSet,
    DebtPaymentViewSet,
    DebtViewSet,
    HealthView,
    InventoryMovementViewSet,
    LoginView,
    MeView,
    ProductViewSet,
    ResetDataView,
    SaleCreateView,
    SaleReturnView,
    SaleViewSet,
    SettingsView,
    UserViewSet,
)

router = DefaultRouter()
router.register('users', UserViewSet, basename='users')
router.register('categories', CategoryViewSet, basename='categories')
router.register('products', ProductViewSet, basename='products')
router.register('customers', CustomerViewSet, basename='customers')
router.register('sales', SaleViewSet, basename='sales')
router.register('debts', DebtViewSet, basename='debts')
router.register('debt-payments', DebtPaymentViewSet, basename='debt-payments')
router.register('movements', InventoryMovementViewSet, basename='movements')

urlpatterns = [
    path('health/', HealthView.as_view(), name='health'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('bootstrap/', BootstrapView.as_view(), name='bootstrap'),
    path('settings/', SettingsView.as_view(), name='settings'),
    path('sales/create/', SaleCreateView.as_view(), name='sale-create'),
    path('sales/<uuid:sale_id>/return/', SaleReturnView.as_view(), name='sale-return'),
    path('admin/reset-data/', ResetDataView.as_view(), name='reset-data'),
    path('', include(router.urls)),
]
