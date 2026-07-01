import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class POSUser(AbstractUser):
    ROLE_ADMIN = 'admin'
    ROLE_MANAGER = 'manager'
    ROLE_SELLER = 'seller'
    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Admin'),
        (ROLE_MANAGER, 'Manager'),
        (ROLE_SELLER, 'Seller'),
    ]

    STATUS_ACTIVE = 'active'
    STATUS_BLOCKED = 'blocked'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_BLOCKED, 'Blocked'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=150)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_SELLER)
    account_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'display_name']

    def __str__(self):
        return self.display_name


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_INACTIVE = 'inactive'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_INACTIVE, 'Inactive'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    barcode = models.CharField(max_length=64, unique=True)
    qr_code_data = models.CharField(max_length=128)
    sale_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    supply_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    stock = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    min_stock = models.DecimalField(max_digits=14, decimal_places=2, default=5)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    description = models.TextField(blank=True, default='')
    image = models.URLField(blank=True, default='')
    shkaf = models.CharField(max_length=50, blank=True, default='')
    polka = models.CharField(max_length=50, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Customer(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_INACTIVE = 'inactive'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_INACTIVE, 'Inactive'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=32, blank=True, default='')
    address = models.TextField(blank=True, default='')
    notes = models.TextField(blank=True, default='')
    debt_limit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    current_debt = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_sales = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    last_sale_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    allow_debt = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Sale(models.Model):
    PAYMENT_CASH = 'cash'
    PAYMENT_DEBT = 'debt'
    PAYMENT_MIXED = 'mixed'
    PAYMENT_CHOICES = [
        (PAYMENT_CASH, 'Cash'),
        (PAYMENT_DEBT, 'Debt'),
        (PAYMENT_MIXED, 'Mixed'),
    ]

    STATUS_COMPLETED = 'completed'
    STATUS_RETURNED = 'returned'
    STATUS_CHOICES = [
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_RETURNED, 'Returned'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receipt_no = models.CharField(max_length=32, unique=True)
    date_time = models.DateTimeField()
    seller = models.ForeignKey(POSUser, on_delete=models.PROTECT, related_name='sales')
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    total_amount = models.DecimalField(max_digits=14, decimal_places=2)
    discount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_CHOICES)
    cash_paid = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    debt_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_COMPLETED)
    return_reason = models.TextField(blank=True, default='')
    debt_due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_time']

    def __str__(self):
        return f'#{self.receipt_no}'


class SaleItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='sale_items')
    product_name = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=14, decimal_places=2)
    price = models.DecimalField(max_digits=14, decimal_places=2)
    total = models.DecimalField(max_digits=14, decimal_places=2)

    def __str__(self):
        return f'{self.product_name} x {self.quantity}'


class Debt(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_PAID = 'paid'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_PAID, 'Paid'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='debts')
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='debts')
    receipt_no = models.CharField(max_length=32)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    remaining_amount = models.DecimalField(max_digits=14, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']


class DebtPayment(models.Model):
    PAYMENT_CASH = 'cash'
    PAYMENT_CHOICES = [(PAYMENT_CASH, 'Cash')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='debt_payments')
    debt = models.ForeignKey(Debt, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default=PAYMENT_CASH)
    date_time = models.DateTimeField()

    class Meta:
        ordering = ['-date_time']


class InventoryMovement(models.Model):
    TYPE_IN = 'in'
    TYPE_OUT = 'out'
    TYPE_CHOICES = [(TYPE_IN, 'In'), (TYPE_OUT, 'Out')]

    REASON_NEW_STOCK = 'new_stock'
    REASON_RETURN = 'return'
    REASON_SALE = 'sale'
    REASON_LOSS = 'loss'
    REASON_INVENTORY_CHECK = 'inventory_check'
    REASON_PRODUCTION = 'production'
    REASON_CHOICES = [
        (REASON_NEW_STOCK, 'New stock'),
        (REASON_RETURN, 'Return'),
        (REASON_SALE, 'Sale'),
        (REASON_LOSS, 'Loss'),
        (REASON_INVENTORY_CHECK, 'Inventory check'),
        (REASON_PRODUCTION, 'Production'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='movements')
    product_name = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=14, decimal_places=2)
    movement_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    doc_no = models.CharField(max_length=64)
    date_time = models.DateTimeField()
    user = models.ForeignKey(POSUser, on_delete=models.PROTECT, related_name='movements')

    class Meta:
        ordering = ['-date_time']


class StoreSettings(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    store_name = models.CharField(max_length=255, default='CDCGroup POS')
    address = models.TextField(blank=True, default='')
    phone = models.CharField(max_length=64, blank=True, default='')
    logo_url = models.URLField(blank=True, default='')
    currency = models.CharField(max_length=16, default="so'm")
    usd_rate = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=12800,
        help_text="1 AQSh dollari = necha so'm",
    )
    tax_rate_default = models.DecimalField(max_digits=6, decimal_places=2, default=12)
    receipt_footer = models.TextField(blank=True, default='Xaridingiz uchun tashakkur!')
    receipt_no_format = models.CharField(max_length=32, default='000000')
    auto_print = models.BooleanField(default=False)
    min_stock_threshold_default = models.DecimalField(max_digits=14, decimal_places=2, default=10)
    default_debt_limit = models.DecimalField(max_digits=14, decimal_places=2, default=1000000)
    limit_block_sales = models.BooleanField(default=True)
    mandatory_debt_due_date = models.BooleanField(default=True)
    receipt_counter = models.PositiveIntegerField(default=100000)
    production_counter = models.PositiveIntegerField(default=1)
    production_margin_percent = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=20,
        help_text='Ishlab chiqarish uchun standart ustama foizi',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'store settings'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Technician(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_INACTIVE = 'inactive'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_INACTIVE, 'Inactive'),
    ]

    LABOR_DAILY = 'daily'
    LABOR_PER_UNIT = 'per_unit'
    LABOR_TYPE_CHOICES = [
        (LABOR_DAILY, 'Daily wage'),
        (LABOR_PER_UNIT, 'Per unit'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=32, blank=True, default='')
    default_labor_type = models.CharField(
        max_length=20,
        choices=LABOR_TYPE_CHOICES,
        default=LABOR_DAILY,
        help_text='Standart ish haqi turi: kunlik yoki dona (uskuna)',
    )
    daily_rate = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        help_text='Kunlik ish haqi (so\'m)',
    )
    per_unit_rate = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        help_text='1 ta uskuna uchun haq (so\'m)',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class ProductionOrder(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED = 'completed'
    STATUS_SOLD = 'sold'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_IN_PROGRESS, 'In progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_SOLD, 'Sold'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_no = models.CharField(max_length=32, unique=True)
    title = models.CharField(max_length=255)
    technician = models.ForeignKey(
        Technician,
        on_delete=models.PROTECT,
        related_name='production_orders',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    labor_type = models.CharField(
        max_length=20,
        choices=Technician.LABOR_TYPE_CHOICES,
        default=Technician.LABOR_DAILY,
        help_text='Ish haqi turi: kunlik yoki dona (uskuna)',
    )
    labor_quantity = models.PositiveSmallIntegerField(
        default=1,
        help_text='Kunlik rejimda — ish kunlari; dona rejimda — uskuna soni',
    )
    daily_rate_snapshot = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    per_unit_rate_snapshot = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    margin_percent = models.DecimalField(max_digits=6, decimal_places=2, default=20)
    parts_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    labor_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    profit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.TextField(blank=True, default='')
    sale = models.ForeignKey(
        Sale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='production_orders',
    )
    created_by = models.ForeignKey(
        POSUser,
        on_delete=models.PROTECT,
        related_name='created_production_orders',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    sold_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.order_no} — {self.title}'


class ProductionOrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        ProductionOrder,
        on_delete=models.CASCADE,
        related_name='items',
    )
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='production_items')
    product_name = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=14, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2)
    total = models.DecimalField(max_digits=14, decimal_places=2)
    movement = models.ForeignKey(
        InventoryMovement,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='production_items',
    )

    def __str__(self):
        return f'{self.product_name} x {self.quantity}'
