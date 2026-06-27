import os
from datetime import datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from core.models import (
    Category,
    Customer,
    Debt,
    InventoryMovement,
    Product,
    Sale,
    SaleItem,
    StoreSettings,
)

User = get_user_model()


class Command(BaseCommand):
    help = 'POS tizimi uchun boshlang\'ich demo ma\'lumotlarni yuklash'

    def handle(self, *args, **options):
        settings = StoreSettings.get_solo()
        settings.store_name = 'CDCGroup POS'
        settings.address = "Toshkent shahar, Mirzo Ulug'bek tumani, Mustaqillik shoh ko'chasi, 45-uy"
        settings.phone = '+998 71 200-30-40'
        settings.currency = "so'm"
        settings.receipt_footer = 'Xaridingiz uchun tashakkur! Yana keling!'
        settings.default_debt_limit = Decimal('1000000')
        settings.save()

        users_data = [
            ('seller@pos.uz', 'seller', 'Ali Valiyev', User.ROLE_SELLER),
            ('manager@pos.uz', 'manager', 'Sardor Rahimovich', User.ROLE_MANAGER),
            ('riskgroup77@gmail.com', 'admin', 'Zafar Karimov (Tizim Egasi)', User.ROLE_ADMIN),
        ]
        for email, password, name, role in users_data:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'display_name': name,
                    'role': role,
                    'account_status': User.STATUS_ACTIVE,
                },
            )
            if created or os.getenv('SEED_FORCE_PASSWORDS', 'false').lower() == 'true':
                user.set_password(password)
                user.display_name = name
                user.role = role
                user.account_status = User.STATUS_ACTIVE
                user.save()

        categories = {}
        for name, desc in [
            ('Ichimliklar', 'Salqin va qaynoq ichimliklar'),
            ('Oziq-ovqat', 'Kundalik ehtiyoj mahsulotlari'),
            ('Shirinliklar', 'Shokoladlar va konfetlar'),
            ('Sut mahsulotlari', 'Sut, qatiq, pishloq'),
            ('Meva va Sabzavotlar', 'Yangi mevalar'),
        ]:
            cat, _ = Category.objects.get_or_create(name=name, defaults={'description': desc})
            categories[name] = cat

        products_data = [
            ('Coca-Cola 1.5L', 'Ichimliklar', '4820000190013', 13500, 9500, 45, 10),
            ('Pepsi 1.5L', 'Ichimliklar', '4820000190020', 13000, 9000, 28, 10),
            ('Snickers Maxi 80g', 'Shirinliklar', '5000159461122', 9500, 6500, 8, 15),
            ('Nestle Sut 1L 3.2%', 'Sut mahsulotlari', '4600605021045', 16000, 12000, 35, 8),
            ('Chorsu Obi Non', 'Oziq-ovqat', '0000000001111', 4000, 2500, 15, 15),
            ('Makaron Chust premium', 'Oziq-ovqat', '4780005510129', 11000, 8000, 3, 10),
            ('Bonaqua Gazsiz 1L', 'Ichimliklar', '4820000190501', 4500, 2800, 60, 12),
        ]
        for name, cat_name, barcode, sale, supply, stock, min_stock in products_data:
            Product.objects.update_or_create(
                barcode=barcode,
                defaults={
                    'name': name,
                    'category': categories[cat_name],
                    'qr_code_data': f'PROD-{barcode}',
                    'sale_price': sale,
                    'supply_price': supply,
                    'stock': stock,
                    'min_stock': min_stock,
                    'status': Product.STATUS_ACTIVE,
                },
            )

        customers_data = [
            ('Bekzod Karimov', '+998 90 123-45-67', 2000000, 345000, True),
            ('Dilshod To\'rayev', '+998 93 456-78-90', 1000000, 0, False),
            ('Lola Karimova', '+998 94 888-22-33', 500000, 120000, True),
        ]
        for name, phone, limit, debt, allow in customers_data:
            Customer.objects.update_or_create(
                name=name,
                defaults={
                    'phone': phone,
                    'debt_limit': limit,
                    'current_debt': debt,
                    'allow_debt': allow,
                    'status': Customer.STATUS_ACTIVE,
                },
            )

        self.stdout.write(self.style.SUCCESS('Demo ma\'lumotlar muvaffaqiyatli yuklandi.'))
        self.stdout.write('Login: seller@pos.uz / seller | manager@pos.uz / manager | riskgroup77@gmail.com / admin')
