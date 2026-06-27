from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import serializers

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


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='display_name')
    status = serializers.CharField(source='account_status')

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role', 'status']
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.id)
        return data


class UserCreateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='display_name')
    password = serializers.CharField(write_only=True, min_length=8)
    status = serializers.CharField(source='account_status', required=False, default='active')

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role', 'status', 'password']

    def create(self, validated_data):
        display_name = validated_data.pop('display_name')
        password = validated_data.pop('password')
        email = validated_data['email'].lower()
        user = User(
            username=email,
            email=email,
            display_name=display_name,
            role=validated_data.get('role', User.ROLE_SELLER),
            account_status=validated_data.get('account_status', User.STATUS_ACTIVE),
        )
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='display_name', required=False)
    status = serializers.CharField(source='account_status', required=False)

    class Meta:
        model = User
        fields = ['name', 'role', 'status']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.id)
        return data


class ProductSerializer(serializers.ModelSerializer):
    categoryId = serializers.PrimaryKeyRelatedField(source='category', queryset=Category.objects.all())
    qrCodeData = serializers.CharField(source='qr_code_data', required=False)
    salePrice = serializers.DecimalField(source='sale_price', max_digits=14, decimal_places=2)
    supplyPrice = serializers.DecimalField(source='supply_price', max_digits=14, decimal_places=2, required=False)
    minStock = serializers.DecimalField(source='min_stock', max_digits=14, decimal_places=2, required=False)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'categoryId', 'barcode', 'qrCodeData',
            'salePrice', 'supplyPrice', 'stock', 'minStock', 'status',
            'description', 'image', 'shkaf', 'polka',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['categoryId'] = str(instance.category_id)
        data['salePrice'] = float(instance.sale_price)
        data['supplyPrice'] = float(instance.supply_price)
        data['stock'] = float(instance.stock)
        data['minStock'] = float(instance.min_stock)
        data['id'] = str(instance.id)
        return data

    def create(self, validated_data):
        category = validated_data.pop('category')
        barcode = validated_data.get('barcode') or str(abs(hash(validated_data['name'])) % 10**13)
        validated_data.setdefault('barcode', barcode)
        validated_data.setdefault('qr_code_data', f"PROD-{validated_data['barcode']}")
        validated_data.setdefault('supply_price', Decimal('0'))
        validated_data.setdefault('min_stock', Decimal('5'))
        return Product.objects.create(category=category, **validated_data)

    def update(self, instance, validated_data):
        if 'category' in validated_data:
            instance.category = validated_data.pop('category')
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class CustomerSerializer(serializers.ModelSerializer):
    debtLimit = serializers.DecimalField(source='debt_limit', max_digits=14, decimal_places=2, required=False)
    currentDebt = serializers.DecimalField(source='current_debt', max_digits=14, decimal_places=2, read_only=True)
    totalSales = serializers.DecimalField(source='total_sales', max_digits=14, decimal_places=2, read_only=True)
    lastSaleDate = serializers.DateTimeField(source='last_sale_date', read_only=True, allow_null=True)
    allowDebt = serializers.BooleanField(source='allow_debt', required=False)

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'address', 'notes',
            'debtLimit', 'currentDebt', 'totalSales', 'lastSaleDate',
            'status', 'allowDebt',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.id)
        data['debtLimit'] = float(instance.debt_limit)
        data['currentDebt'] = float(instance.current_debt)
        data['totalSales'] = float(instance.total_sales)
        data['lastSaleDate'] = instance.last_sale_date.isoformat() if instance.last_sale_date else None
        return data


class SaleItemInputSerializer(serializers.Serializer):
    productId = serializers.UUIDField()
    productName = serializers.CharField(required=False)
    quantity = serializers.DecimalField(max_digits=14, decimal_places=2)
    price = serializers.DecimalField(max_digits=14, decimal_places=2)
    total = serializers.DecimalField(max_digits=14, decimal_places=2)


class SaleItemSerializer(serializers.ModelSerializer):
    saleId = serializers.UUIDField(source='sale_id', read_only=True)
    productId = serializers.UUIDField(source='product_id', read_only=True)
    productName = serializers.CharField(source='product_name')

    class Meta:
        model = SaleItem
        fields = ['id', 'saleId', 'productId', 'productName', 'quantity', 'price', 'total']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for key in ['id', 'saleId', 'productId']:
            data[key] = str(data[key])
        data['quantity'] = float(instance.quantity)
        data['price'] = float(instance.price)
        data['total'] = float(instance.total)
        return data


class SaleSerializer(serializers.ModelSerializer):
    receiptNo = serializers.CharField(source='receipt_no', read_only=True)
    dateTime = serializers.DateTimeField(source='date_time', required=False)
    sellerId = serializers.UUIDField(source='seller_id', read_only=True)
    sellerName = serializers.CharField(source='seller.display_name', read_only=True)
    customerId = serializers.PrimaryKeyRelatedField(
        source='customer', queryset=Customer.objects.all(), allow_null=True, required=False
    )
    customerName = serializers.CharField(source='customer.name', read_only=True, allow_null=True)
    totalAmount = serializers.DecimalField(source='total_amount', max_digits=14, decimal_places=2)
    finalAmount = serializers.DecimalField(source='final_amount', max_digits=14, decimal_places=2)
    paymentType = serializers.ChoiceField(source='payment_type', choices=Sale.PAYMENT_CHOICES)
    cashPaid = serializers.DecimalField(source='cash_paid', max_digits=14, decimal_places=2)
    debtAmount = serializers.DecimalField(source='debt_amount', max_digits=14, decimal_places=2)
    returnReason = serializers.CharField(source='return_reason', read_only=True)
    items = SaleItemInputSerializer(many=True, write_only=True)
    dueDate = serializers.DateField(source='debt_due_date', required=False, allow_null=True)

    class Meta:
        model = Sale
        fields = [
            'id', 'receiptNo', 'dateTime', 'sellerId', 'sellerName',
            'customerId', 'customerName', 'totalAmount', 'discount', 'finalAmount',
            'paymentType', 'cashPaid', 'debtAmount', 'status', 'returnReason',
            'items', 'dueDate',
        ]
        read_only_fields = ['id', 'receiptNo', 'sellerId', 'sellerName', 'customerName', 'status', 'returnReason']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.id)
        data['sellerId'] = str(instance.seller_id)
        data['customerId'] = str(instance.customer_id) if instance.customer_id else None
        data['customerName'] = instance.customer.name if instance.customer else None
        data['totalAmount'] = float(instance.total_amount)
        data['discount'] = float(instance.discount)
        data['finalAmount'] = float(instance.final_amount)
        data['cashPaid'] = float(instance.cash_paid)
        data['debtAmount'] = float(instance.debt_amount)
        data['dateTime'] = instance.date_time.isoformat()
        data['items'] = SaleItemSerializer(instance.items.all(), many=True).data
        return data


class DebtSerializer(serializers.ModelSerializer):
    customerId = serializers.UUIDField(source='customer_id', read_only=True)
    customerName = serializers.CharField(source='customer.name', read_only=True)
    saleId = serializers.UUIDField(source='sale_id', read_only=True)
    receiptNo = serializers.CharField(source='receipt_no')
    remainingAmount = serializers.DecimalField(source='remaining_amount', max_digits=14, decimal_places=2)
    dueDate = serializers.DateField(source='due_date', allow_null=True)
    createdAt = serializers.DateTimeField(source='created_at')

    class Meta:
        model = Debt
        fields = [
            'id', 'customerId', 'customerName', 'saleId', 'receiptNo',
            'amount', 'remainingAmount', 'status', 'dueDate', 'createdAt',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for key in ['id', 'customerId', 'saleId']:
            data[key] = str(data[key])
        data['amount'] = float(instance.amount)
        data['remainingAmount'] = float(instance.remaining_amount)
        data['dueDate'] = instance.due_date.isoformat() if instance.due_date else None
        data['createdAt'] = instance.created_at.isoformat()
        return data


class DebtPaymentSerializer(serializers.ModelSerializer):
    customerId = serializers.UUIDField(source='customer_id', read_only=True)
    customerName = serializers.CharField(source='customer.name', read_only=True)
    debtId = serializers.UUIDField(source='debt_id', read_only=True, allow_null=True)
    paymentType = serializers.CharField(source='payment_type')
    dateTime = serializers.DateTimeField(source='date_time')

    class Meta:
        model = DebtPayment
        fields = ['id', 'customerId', 'customerName', 'debtId', 'amount', 'paymentType', 'dateTime']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.id)
        data['customerId'] = str(instance.customer_id)
        data['debtId'] = str(instance.debt_id) if instance.debt_id else None
        data['amount'] = float(instance.amount)
        data['dateTime'] = instance.date_time.isoformat()
        return data


class InventoryMovementSerializer(serializers.ModelSerializer):
    productId = serializers.UUIDField(source='product_id', read_only=True)
    productName = serializers.CharField(source='product_name')
    type = serializers.CharField(source='movement_type')
    dateTime = serializers.DateTimeField(source='date_time')
    userId = serializers.UUIDField(source='user_id', read_only=True)
    userName = serializers.CharField(source='user.display_name', read_only=True)

    class Meta:
        model = InventoryMovement
        fields = [
            'id', 'productId', 'productName', 'quantity', 'type',
            'reason', 'docNo', 'dateTime', 'userId', 'userName',
        ]
        extra_kwargs = {'docNo': {'source': 'doc_no'}}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.id)
        data['productId'] = str(instance.product_id)
        data['userId'] = str(instance.user_id)
        data['quantity'] = float(instance.quantity)
        data['dateTime'] = instance.date_time.isoformat()
        data['docNo'] = instance.doc_no
        return data


class InventoryMovementCreateSerializer(serializers.Serializer):
    productId = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=14, decimal_places=2)
    type = serializers.ChoiceField(choices=InventoryMovement.TYPE_CHOICES)
    reason = serializers.ChoiceField(choices=InventoryMovement.REASON_CHOICES)
    docNo = serializers.CharField(required=False, allow_blank=True)
    supplyPrice = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    salePrice = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    minStock = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    shkaf = serializers.CharField(required=False, allow_blank=True)
    polka = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)


class StoreSettingsSerializer(serializers.ModelSerializer):
    logoUrl = serializers.URLField(source='logo_url', required=False, allow_blank=True)
    taxRateDefault = serializers.DecimalField(source='tax_rate_default', max_digits=6, decimal_places=2, required=False)
    receiptFooter = serializers.CharField(source='receipt_footer', required=False)
    receiptNoFormat = serializers.CharField(source='receipt_no_format', required=False)
    autoPrint = serializers.BooleanField(source='auto_print', required=False)
    minStockThresholdDefault = serializers.DecimalField(source='min_stock_threshold_default', max_digits=14, decimal_places=2, required=False)
    defaultDebtLimit = serializers.DecimalField(source='default_debt_limit', max_digits=14, decimal_places=2, required=False)
    limitBlockSales = serializers.BooleanField(source='limit_block_sales', required=False)
    mandatoryDebtDueDate = serializers.BooleanField(source='mandatory_debt_due_date', required=False)

    class Meta:
        model = StoreSettings
        fields = [
            'storeName', 'address', 'phone', 'logoUrl', 'currency',
            'taxRateDefault', 'receiptFooter', 'receiptNoFormat', 'autoPrint',
            'minStockThresholdDefault', 'defaultDebtLimit', 'limitBlockSales',
            'mandatoryDebtDueDate',
        ]
        extra_kwargs = {'storeName': {'source': 'store_name'}}

    def to_representation(self, instance):
        return {
            'storeName': instance.store_name,
            'address': instance.address,
            'phone': instance.phone,
            'logoUrl': instance.logo_url,
            'currency': instance.currency,
            'taxRateDefault': float(instance.tax_rate_default),
            'receiptFooter': instance.receipt_footer,
            'receiptNoFormat': instance.receipt_no_format,
            'autoPrint': instance.auto_print,
            'minStockThresholdDefault': float(instance.min_stock_threshold_default),
            'defaultDebtLimit': float(instance.default_debt_limit),
            'limitBlockSales': instance.limit_block_sales,
            'mandatoryDebtDueDate': instance.mandatory_debt_due_date,
        }

    def update(self, instance, validated_data):
        field_map = {
            'store_name': 'storeName',
            'logo_url': 'logoUrl',
            'tax_rate_default': 'taxRateDefault',
            'receipt_footer': 'receiptFooter',
            'receipt_no_format': 'receiptNoFormat',
            'auto_print': 'autoPrint',
            'min_stock_threshold_default': 'minStockThresholdDefault',
            'default_debt_limit': 'defaultDebtLimit',
            'limit_block_sales': 'limitBlockSales',
            'mandatory_debt_due_date': 'mandatoryDebtDueDate',
        }
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class BulkImportProductSerializer(serializers.Serializer):
    name = serializers.CharField()
    categoryId = serializers.UUIDField(required=False, allow_null=True)
    category = serializers.CharField(required=False, allow_blank=True)
    barcode = serializers.CharField(required=False, allow_blank=True)
    salePrice = serializers.DecimalField(max_digits=14, decimal_places=2, default=0)
    supplyPrice = serializers.DecimalField(max_digits=14, decimal_places=2, default=0)
    stock = serializers.DecimalField(max_digits=14, decimal_places=2, default=0)
    minStock = serializers.DecimalField(max_digits=14, decimal_places=2, default=5)
    shkaf = serializers.CharField(required=False, allow_blank=True)
    polka = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=False, default='active')


class BulkImportSerializer(serializers.Serializer):
    products = BulkImportProductSerializer(many=True)
    duplicateAction = serializers.ChoiceField(
        choices=['update_stock', 'overwrite', 'skip'],
        default='update_stock',
    )


class RepayDebtSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.01'))


class ReturnSaleSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=3)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
