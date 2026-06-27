from django.contrib import admin
from django.contrib.auth import get_user_model

from .models import (
    Category,
    Customer,
    Debt,
    DebtPayment,
    InventoryMovement,
    Product,
    Sale,
    SaleItem,
    StoreSettings,
)

User = get_user_model()


@admin.register(User)
class POSUserAdmin(admin.ModelAdmin):
    list_display = ('email', 'display_name', 'role', 'account_status', 'is_staff')
    list_filter = ('role', 'account_status')
    search_fields = ('email', 'display_name')


admin.site.register(Category)
admin.site.register(Product)
admin.site.register(Customer)
admin.site.register(Sale)
admin.site.register(SaleItem)
admin.site.register(Debt)
admin.site.register(DebtPayment)
admin.site.register(InventoryMovement)
admin.site.register(StoreSettings)
