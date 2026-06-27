from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from core.models import (
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

USERS = [
    {
        'email': 'admin@pos.uz',
        'password': 'admin123',
        'display_name': 'Administrator',
        'role': User.ROLE_ADMIN,
    },
    {
        'email': 'manager@pos.uz',
        'password': 'manager123',
        'display_name': 'Menejer',
        'role': User.ROLE_MANAGER,
    },
    {
        'email': 'seller@pos.uz',
        'password': 'seller123',
        'display_name': 'Sotuvchi',
        'role': User.ROLE_SELLER,
    },
]


class Command(BaseCommand):
    help = "Barcha ma'lumotlarni tozalash va faqat 3 ta foydalanuvchi yaratish"

    def handle(self, *args, **options):
        SaleItem.objects.all().delete()
        DebtPayment.objects.all().delete()
        Debt.objects.all().delete()
        Sale.objects.all().delete()
        InventoryMovement.objects.all().delete()
        Product.objects.all().delete()
        Customer.objects.all().delete()
        Category.objects.all().delete()
        User.objects.all().delete()

        StoreSettings.objects.filter(pk=1).delete()
        StoreSettings.get_solo()

        for u in USERS:
            user = User(
                username=u['email'],
                email=u['email'],
                display_name=u['display_name'],
                role=u['role'],
                account_status=User.STATUS_ACTIVE,
            )
            user.set_password(u['password'])
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Yaratildi: {u['email']}"))

        self.stdout.write(self.style.SUCCESS("\nBarcha ma'lumotlar tozalandi. Faqat 3 ta foydalanuvchi qoldi."))
