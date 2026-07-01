# Generated manually for production module

import uuid
from decimal import Decimal

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_storesettings_usd_rate'),
    ]

    operations = [
        migrations.AddField(
            model_name='storesettings',
            name='production_counter',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='storesettings',
            name='production_margin_percent',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('20'),
                help_text='Ishlab chiqarish uchun standart ustama foizi',
                max_digits=6,
            ),
        ),
        migrations.AlterField(
            model_name='inventorymovement',
            name='reason',
            field=models.CharField(
                choices=[
                    ('new_stock', 'New stock'),
                    ('return', 'Return'),
                    ('sale', 'Sale'),
                    ('loss', 'Loss'),
                    ('inventory_check', 'Inventory check'),
                    ('production', 'Production'),
                ],
                max_length=30,
            ),
        ),
        migrations.CreateModel(
            name='Technician',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=150)),
                ('phone', models.CharField(blank=True, default='', max_length=32)),
                ('daily_rate', models.DecimalField(decimal_places=2, default=0, help_text="Kunlik ish haqi (so'm)", max_digits=14)),
                ('per_unit_rate', models.DecimalField(decimal_places=2, default=0, help_text="1 ta uskuna uchun haq (so'm)", max_digits=14)),
                ('status', models.CharField(choices=[('active', 'Active'), ('inactive', 'Inactive')], default='active', max_length=20)),
                ('notes', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='ProductionOrder',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('order_no', models.CharField(max_length=32, unique=True)),
                ('title', models.CharField(max_length=255)),
                ('status', models.CharField(
                    choices=[
                        ('draft', 'Draft'),
                        ('in_progress', 'In progress'),
                        ('completed', 'Completed'),
                        ('sold', 'Sold'),
                        ('cancelled', 'Cancelled'),
                    ],
                    default='draft',
                    max_length=20,
                )),
                ('work_days', models.PositiveSmallIntegerField(default=1, help_text='Ishlangan kunlar soni')),
                ('daily_rate_snapshot', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('per_unit_rate_snapshot', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('margin_percent', models.DecimalField(decimal_places=2, default=20, max_digits=6)),
                ('parts_cost', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('labor_cost', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('total_cost', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('selling_price', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('profit', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('notes', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('sold_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='created_production_orders',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('sale', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='production_orders',
                    to='core.sale',
                )),
                ('technician', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='production_orders',
                    to='core.technician',
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ProductionOrderItem',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('product_name', models.CharField(max_length=255)),
                ('quantity', models.DecimalField(decimal_places=2, max_digits=14)),
                ('unit_cost', models.DecimalField(decimal_places=2, max_digits=14)),
                ('total', models.DecimalField(decimal_places=2, max_digits=14)),
                ('movement', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='production_items',
                    to='core.inventorymovement',
                )),
                ('order', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='items',
                    to='core.productionorder',
                )),
                ('product', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='production_items',
                    to='core.product',
                )),
            ],
        ),
    ]
