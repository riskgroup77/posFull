import os
import secrets

from django.core.management.base import BaseCommand, CommandError
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


class Command(BaseCommand):
    help = "Barcha ma'lumotlarni tozalash va 3 ta boshlang'ich foydalanuvchi yaratish"

    def handle(self, *args, **options):
        base_password = os.getenv('POS_SETUP_PASSWORD')
        if not base_password:
            base_password = secrets.token_urlsafe(12)
            self.stdout.write(self.style.WARNING(
                'POS_SETUP_PASSWORD berilmagan — tasodifiy parollar yaratildi (quyida).'
            ))

        users_spec = [
            ('admin@pos.uz', 'Administrator', User.ROLE_ADMIN, f'{base_password}!Adm'),
            ('manager@pos.uz', 'Menejer', User.ROLE_MANAGER, f'{base_password}!Mgr'),
            ('seller@pos.uz', 'Sotuvchi', User.ROLE_SELLER, f'{base_password}!Sel'),
        ]

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

        for email, display_name, role, password in users_spec:
            user = User(
                username=email,
                email=email,
                display_name=display_name,
                role=role,
                account_status=User.STATUS_ACTIVE,
            )
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Yaratildi: {email}'))
            self.stdout.write(f'  Parol: {password}')

        self.stdout.write(self.style.SUCCESS("\nBarcha ma'lumotlar tozalandi. Parollarni xavfsiz joyda saqlang."))
