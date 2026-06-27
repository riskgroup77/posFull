from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

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


def next_receipt_no():
    settings = StoreSettings.get_solo()
    settings.receipt_counter += 1
    settings.save(update_fields=['receipt_counter', 'updated_at'])
    return str(settings.receipt_counter).zfill(6)


@transaction.atomic
def create_sale(user, data):
    settings = StoreSettings.get_solo()
    customer = None
    customer_id = data.get('customerId') or data.get('customer_id')

    if customer_id:
        customer = Customer.objects.get(pk=customer_id)
        if data['payment_type'] in (Sale.PAYMENT_DEBT, Sale.PAYMENT_MIXED):
            if customer.status != Customer.STATUS_ACTIVE:
                raise ValueError('Mijoz nofaol — nasiya berib bo\'lmaydi')
            if not customer.allow_debt:
                raise ValueError('Ushbu mijozga nasiya taqiqlangan')
            pending_debt = Decimal(str(data.get('debt_amount', data.get('debtAmount', 0))))
            if settings.limit_block_sales and customer.current_debt + pending_debt > customer.debt_limit:
                raise ValueError('Nasiya limiti oshib ketdi')

    receipt_no = next_receipt_no()
    sale = Sale.objects.create(
        receipt_no=receipt_no,
        date_time=data.get('date_time') or timezone.now(),
        seller=user,
        customer=customer,
        total_amount=data['total_amount'],
        discount=data.get('discount', 0),
        final_amount=data['final_amount'],
        payment_type=data['payment_type'],
        cash_paid=data.get('cash_paid', 0),
        debt_amount=data.get('debt_amount', 0),
        debt_due_date=data.get('debt_due_date'),
    )

    for item in data['items']:
        product = Product.objects.select_for_update().get(pk=item['productId'])
        qty = Decimal(str(item['quantity']))
        if product.stock < qty:
            raise ValueError(f"{product.name} uchun omborda yetarli qoldiq yo'q")

        product.stock -= qty
        product.save(update_fields=['stock', 'updated_at'])

        SaleItem.objects.create(
            sale=sale,
            product=product,
            product_name=item.get('productName') or product.name,
            quantity=qty,
            price=item['price'],
            total=item['total'],
        )

        InventoryMovement.objects.create(
            product=product,
            product_name=product.name,
            quantity=qty,
            movement_type=InventoryMovement.TYPE_OUT,
            reason=InventoryMovement.REASON_SALE,
            doc_no=receipt_no,
            date_time=sale.date_time,
            user=user,
        )

    if customer and sale.debt_amount > 0:
        customer.current_debt += sale.debt_amount
        customer.total_sales += sale.final_amount
        customer.last_sale_date = sale.date_time
        customer.save(update_fields=['current_debt', 'total_sales', 'last_sale_date'])
        due = sale.debt_due_date or (timezone.now().date() + timedelta(days=10))
        Debt.objects.create(
            customer=customer,
            sale=sale,
            receipt_no=receipt_no,
            amount=sale.debt_amount,
            remaining_amount=sale.debt_amount,
            status=Debt.STATUS_PENDING,
            due_date=due,
            created_at=sale.date_time,
        )
    elif customer:
        customer.total_sales += sale.final_amount
        customer.last_sale_date = sale.date_time
        customer.save(update_fields=['total_sales', 'last_sale_date'])

    return sale


@transaction.atomic
def return_sale(sale_id, reason, user):
    sale = Sale.objects.select_for_update().get(pk=sale_id)
    if sale.status == Sale.STATUS_RETURNED:
        raise ValueError('Sotuv allaqachon qaytarilgan')

    sale.status = Sale.STATUS_RETURNED
    sale.return_reason = reason
    sale.save(update_fields=['status', 'return_reason'])

    for item in sale.items.select_related('product'):
        product = Product.objects.select_for_update().get(pk=item.product_id)
        product.stock += item.quantity
        product.save(update_fields=['stock', 'updated_at'])
        InventoryMovement.objects.create(
            product=product,
            product_name=item.product_name,
            quantity=item.quantity,
            movement_type=InventoryMovement.TYPE_IN,
            reason=InventoryMovement.REASON_RETURN,
            doc_no=f'VOZVRAT-{sale.receipt_no}',
            date_time=timezone.now(),
            user=user,
        )

    if sale.customer_id:
        customer = Customer.objects.select_for_update().get(pk=sale.customer_id)
        customer.current_debt = max(Decimal('0'), customer.current_debt - sale.debt_amount)
        customer.total_sales = max(Decimal('0'), customer.total_sales - sale.final_amount)
        customer.save(update_fields=['current_debt', 'total_sales'])
        Debt.objects.filter(sale=sale).update(remaining_amount=0, status=Debt.STATUS_PAID)

    return sale


@transaction.atomic
def repay_customer_debt(customer_id, amount, user):
    customer = Customer.objects.select_for_update().get(pk=customer_id)
    pay_amount = Decimal(str(amount))
    if pay_amount <= 0:
        raise ValueError('To\'lov summasi noto\'g\'ri')
    if pay_amount > customer.current_debt:
        raise ValueError('To\'lov qarzdan oshib ketdi')

    customer.current_debt -= pay_amount
    customer.save(update_fields=['current_debt'])

    payment = DebtPayment.objects.create(
        customer=customer,
        amount=pay_amount,
        payment_type=DebtPayment.PAYMENT_CASH,
        date_time=timezone.now(),
    )

    remaining = pay_amount
    for debt in Debt.objects.filter(customer=customer, status=Debt.STATUS_PENDING).order_by('created_at'):
        if remaining <= 0:
            break
        deduct = min(debt.remaining_amount, remaining)
        debt.remaining_amount -= deduct
        remaining -= deduct
        if debt.remaining_amount <= 0:
            debt.status = Debt.STATUS_PAID
        debt.save(update_fields=['remaining_amount', 'status'])

    return payment


@transaction.atomic
def create_inventory_movement(user, data):
    product = Product.objects.select_for_update().get(pk=data['productId'])
    qty = Decimal(str(data['quantity']))
    movement_type = data['type']

    if movement_type == InventoryMovement.TYPE_IN:
        product.stock += qty
    else:
        if product.stock < qty:
            raise ValueError('Omborda yetarli qoldiq yo\'q')
        product.stock -= qty

    if data.get('supplyPrice') is not None:
        product.supply_price = data['supplyPrice']
    if data.get('salePrice') is not None:
        product.sale_price = data['salePrice']
    if data.get('minStock') is not None:
        product.min_stock = data['minStock']
    if data.get('shkaf'):
        product.shkaf = data['shkaf']
    if data.get('polka'):
        product.polka = data['polka']
    if data.get('description'):
        product.description = data['description']
    product.save()

    movement = InventoryMovement.objects.create(
        product=product,
        product_name=product.name,
        quantity=qty,
        movement_type=movement_type,
        reason=data['reason'],
        doc_no=data.get('docNo') or f"MOV-{timezone.now().strftime('%Y%m%d%H%M%S')}",
        date_time=timezone.now(),
        user=user,
    )
    return movement


@transaction.atomic
def bulk_import_products(products_data, duplicate_action='update_stock'):
    results = []
    for pdata in products_data:
        category = None
        cat_id = pdata.get('categoryId')
        if cat_id:
            category = Category.objects.get(pk=cat_id)
        elif pdata.get('category'):
            category, _ = Category.objects.get_or_create(name=pdata['category'].strip())

        if not category:
            category = Category.objects.first()
            if not category:
                category = Category.objects.create(name='Boshqa')

        barcode = (pdata.get('barcode') or '').strip()
        if not barcode:
            barcode = str(abs(hash(pdata['name'])) % 10**13)

        existing = Product.objects.filter(barcode=barcode).first()
        if existing:
            if duplicate_action == 'skip':
                continue
            if duplicate_action == 'update_stock':
                existing.stock += Decimal(str(pdata.get('stock', 0)))
                if pdata.get('salePrice'):
                    existing.sale_price = pdata['salePrice']
                if pdata.get('supplyPrice'):
                    existing.supply_price = pdata['supplyPrice']
                if pdata.get('shkaf'):
                    existing.shkaf = pdata['shkaf']
                if pdata.get('polka'):
                    existing.polka = pdata['polka']
                existing.status = Product.STATUS_ACTIVE
                existing.save()
                results.append(existing)
                continue
            if duplicate_action == 'overwrite':
                existing.name = pdata['name']
                existing.category = category
                existing.sale_price = pdata.get('salePrice', 0)
                existing.supply_price = pdata.get('supplyPrice', 0)
                existing.stock = pdata.get('stock', 0)
                existing.min_stock = pdata.get('minStock', 5)
                existing.shkaf = pdata.get('shkaf', '')
                existing.polka = pdata.get('polka', '')
                existing.description = pdata.get('description', '')
                existing.status = pdata.get('status', Product.STATUS_ACTIVE)
                existing.save()
                results.append(existing)
                continue

        product = Product.objects.create(
            name=pdata['name'],
            category=category,
            barcode=barcode,
            qr_code_data=f'PROD-{barcode}',
            sale_price=pdata.get('salePrice', 0),
            supply_price=pdata.get('supplyPrice', 0),
            stock=pdata.get('stock', 0),
            min_stock=pdata.get('minStock', 5),
            shkaf=pdata.get('shkaf', ''),
            polka=pdata.get('polka', ''),
            description=pdata.get('description', ''),
            status=pdata.get('status', Product.STATUS_ACTIVE),
        )
        results.append(product)
    return results
