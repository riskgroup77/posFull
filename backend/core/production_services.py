from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone

from .models import (
    Category,
    InventoryMovement,
    Product,
    ProductionOrder,
    ProductionOrderItem,
    Sale,
    SaleItem,
    StoreSettings,
    Technician,
)
from .services import _money, _validate_payment_split, next_receipt_no

MONEY_QUANT = Decimal('0.01')
FINISHED_PRODUCT_BARCODE = 'PROD-FINISHED-001'


def next_production_order_no():
    settings = StoreSettings.get_solo()
    settings.production_counter += 1
    settings.save(update_fields=['production_counter', 'updated_at'])
    return f'PO-{str(settings.production_counter).zfill(6)}'


def _get_finished_product():
    category, _ = Category.objects.get_or_create(
        name='Tayyor uskunalar',
        defaults={'description': 'Ishlab chiqarish natijasi'},
    )
    product, _ = Product.objects.get_or_create(
        barcode=FINISHED_PRODUCT_BARCODE,
        defaults={
            'name': 'Ishlab chiqarish (tayyor uskuna)',
            'category': category,
            'qr_code_data': f'PROD-{FINISHED_PRODUCT_BARCODE}',
            'sale_price': Decimal('0'),
            'supply_price': Decimal('0'),
            'stock': Decimal('0'),
            'status': Product.STATUS_INACTIVE,
            'description': 'Tizim mahsuloti — ishlab chiqarish sotuvlari uchun',
        },
    )
    return product


def recalculate_order(order: ProductionOrder, selling_price_override=None):
    parts_cost = Decimal('0')
    for item in order.items.all():
        parts_cost += _money(item.total)

    qty = max(int(order.labor_quantity or 0), 0)
    if order.labor_type == Technician.LABOR_DAILY:
        labor_cost = _money(_money(order.daily_rate_snapshot) * qty)
    else:
        labor_cost = _money(_money(order.per_unit_rate_snapshot) * qty)

    total_cost = _money(parts_cost + labor_cost)
    margin = _money(order.margin_percent)

    if selling_price_override is not None:
        selling_price = _money(selling_price_override)
    elif total_cost > 0:
        selling_price = _money(total_cost * (Decimal('1') + margin / Decimal('100')))
    else:
        selling_price = Decimal('0')

    profit = _money(selling_price - total_cost) if order.status == ProductionOrder.STATUS_SOLD else Decimal('0')

    order.parts_cost = parts_cost
    order.labor_cost = labor_cost
    order.total_cost = total_cost
    order.selling_price = selling_price
    order.profit = profit
    return order


def _ensure_editable(order: ProductionOrder):
    if order.status not in (
        ProductionOrder.STATUS_DRAFT,
        ProductionOrder.STATUS_IN_PROGRESS,
        ProductionOrder.STATUS_COMPLETED,
    ):
        raise ValueError('Buyurtma tahrirlash mumkin emas')


def _ensure_parts_editable(order: ProductionOrder):
    if order.status not in (ProductionOrder.STATUS_DRAFT, ProductionOrder.STATUS_IN_PROGRESS):
        raise ValueError('Qismlarni faqat jarayondagi buyurtmaga qo\'shish mumkin')


@transaction.atomic
def create_production_order(user, data):
    technician_id = data.get('technicianId') or data.get('technician_id')
    technician = Technician.objects.get(pk=technician_id, status=Technician.STATUS_ACTIVE)

    settings = StoreSettings.get_solo()
    labor_quantity = int(data.get('laborQuantity') or data.get('labor_quantity')
                         or data.get('workDays') or data.get('work_days') or 1)
    if labor_quantity < 1:
        raise ValueError('Miqdor kamida 1 bo\'lishi kerak')

    labor_type = data.get('laborType') or data.get('labor_type') or technician.default_labor_type
    if labor_type not in (Technician.LABOR_DAILY, Technician.LABOR_PER_UNIT):
        raise ValueError('Noto\'g\'ri ish haqi turi')

    margin = data.get('marginPercent') or data.get('margin_percent')
    if margin is None:
        margin = settings.production_margin_percent

    order = ProductionOrder.objects.create(
        order_no=next_production_order_no(),
        title=data['title'],
        technician=technician,
        status=ProductionOrder.STATUS_DRAFT,
        labor_type=labor_type,
        labor_quantity=labor_quantity,
        daily_rate_snapshot=technician.daily_rate,
        per_unit_rate_snapshot=technician.per_unit_rate,
        margin_percent=_money(margin),
        notes=data.get('notes', ''),
        created_by=user,
    )
    recalculate_order(order)
    order.save()
    return order


@transaction.atomic
def update_production_order(order_id, data):
    order = ProductionOrder.objects.select_for_update().get(pk=order_id)
    _ensure_editable(order)

    if 'title' in data:
        order.title = data['title']
    if 'notes' in data:
        order.notes = data.get('notes', '')

    labor_quantity = data.get('laborQuantity') or data.get('labor_quantity')
    if labor_quantity is None:
        labor_quantity = data.get('workDays') or data.get('work_days')
    if labor_quantity is not None:
        labor_quantity = int(labor_quantity)
        if labor_quantity < 1:
            raise ValueError('Miqdor kamida 1 bo\'lishi kerak')
        order.labor_quantity = labor_quantity

    labor_type = data.get('laborType') or data.get('labor_type')
    if labor_type is not None:
        if labor_type not in (Technician.LABOR_DAILY, Technician.LABOR_PER_UNIT):
            raise ValueError('Noto\'g\'ri ish haqi turi')
        order.labor_type = labor_type

    technician_id = data.get('technicianId') or data.get('technician_id')
    if technician_id:
        technician = Technician.objects.get(pk=technician_id, status=Technician.STATUS_ACTIVE)
        order.technician = technician
        order.daily_rate_snapshot = technician.daily_rate
        order.per_unit_rate_snapshot = technician.per_unit_rate

    if 'marginPercent' in data or 'margin_percent' in data:
        order.margin_percent = _money(data.get('marginPercent') or data.get('margin_percent'))

    selling_override = data.get('sellingPrice') if 'sellingPrice' in data else data.get('selling_price')
    recalculate_order(order, selling_price_override=selling_override)
    order.save()
    return order


@transaction.atomic
def add_part_to_order(user, order_id, product_id, quantity):
    order = ProductionOrder.objects.select_for_update().get(pk=order_id)
    _ensure_parts_editable(order)
    if qty <= 0:
        raise ValueError('Miqdor noto\'g\'ri')

    product = Product.objects.select_for_update().get(pk=product_id)
    if product.status != Product.STATUS_ACTIVE:
        raise ValueError(f"{product.name} nofaol")

    if product.stock < qty:
        raise ValueError(f"{product.name} uchun omborda yetarli qoldiq yo'q")

    unit_cost = _money(product.supply_price)
    line_total = _money(unit_cost * qty)

    product.stock = _money(product.stock - qty)
    product.save(update_fields=['stock', 'updated_at'])

    movement = InventoryMovement.objects.create(
        product=product,
        product_name=product.name,
        quantity=qty,
        movement_type=InventoryMovement.TYPE_OUT,
        reason=InventoryMovement.REASON_PRODUCTION,
        doc_no=order.order_no,
        date_time=timezone.now(),
        user=user,
    )

    item = ProductionOrderItem.objects.create(
        order=order,
        product=product,
        product_name=product.name,
        quantity=qty,
        unit_cost=unit_cost,
        total=line_total,
        movement=movement,
    )

    if order.status == ProductionOrder.STATUS_DRAFT:
        order.status = ProductionOrder.STATUS_IN_PROGRESS

    recalculate_order(order)
    order.save()
    return item


@transaction.atomic
def remove_part_from_order(user, order_id, item_id):
    order = ProductionOrder.objects.select_for_update().get(pk=order_id)
    _ensure_parts_editable(order)

    item = ProductionOrderItem.objects.select_related('product', 'movement').get(
        pk=item_id,
        order=order,
    )
    product = Product.objects.select_for_update().get(pk=item.product_id)
    qty = _money(item.quantity)

    product.stock = _money(product.stock + qty)
    product.save(update_fields=['stock', 'updated_at'])

    if item.movement_id:
        item.movement.delete()

    item.delete()

    if not order.items.exists() and order.status == ProductionOrder.STATUS_IN_PROGRESS:
        order.status = ProductionOrder.STATUS_DRAFT

    recalculate_order(order)
    order.save()


@transaction.atomic
def complete_production_order(order_id, selling_price=None):
    order = ProductionOrder.objects.select_for_update().prefetch_related('items').get(pk=order_id)

    if order.status not in (ProductionOrder.STATUS_DRAFT, ProductionOrder.STATUS_IN_PROGRESS):
        raise ValueError('Buyurtma allaqachon yakunlangan')

    if not order.items.exists():
        raise ValueError('Kamida bitta qism qo\'shilishi kerak')

    recalculate_order(order, selling_price_override=selling_price)
    order.status = ProductionOrder.STATUS_COMPLETED
    order.completed_at = timezone.now()
    order.save()
    return order


@transaction.atomic
def cancel_production_order(order_id):
    order = ProductionOrder.objects.select_for_update().prefetch_related('items').get(pk=order_id)

    if order.status == ProductionOrder.STATUS_SOLD:
        raise ValueError('Sotilgan buyurtmani bekor qilib bo\'lmaydi')

    if order.status == ProductionOrder.STATUS_CANCELLED:
        return order

    for item in list(order.items.select_related('product').all()):
        product = Product.objects.select_for_update().get(pk=item.product_id)
        qty = _money(item.quantity)
        product.stock = _money(product.stock + qty)
        product.save(update_fields=['stock', 'updated_at'])
        if item.movement_id:
            item.movement.delete()
        item.delete()

    order.status = ProductionOrder.STATUS_CANCELLED
    order.parts_cost = Decimal('0')
    order.labor_cost = Decimal('0')
    order.total_cost = Decimal('0')
    order.selling_price = Decimal('0')
    order.profit = Decimal('0')
    order.save()
    return order


@transaction.atomic
def purge_production_order(order_id):
    """Bekor qilingan buyurtmani bazadan o'chirish."""
    order = ProductionOrder.objects.select_for_update().get(pk=order_id)
    if order.status != ProductionOrder.STATUS_CANCELLED:
        raise ValueError('Faqat bekor qilingan buyurtmani o\'chirish mumkin')
    order.delete()
    return order


@transaction.atomic
def delete_technician(technician_id):
    technician = Technician.objects.get(pk=technician_id)
    if ProductionOrder.objects.filter(
        technician=technician,
    ).exclude(status=ProductionOrder.STATUS_CANCELLED).exists():
        raise ValueError('Ustaga bog\'langan faol buyurtmalar bor — avval ularni yakunlang yoki bekor qiling')
    ProductionOrder.objects.filter(technician=technician, status=ProductionOrder.STATUS_CANCELLED).delete()
    technician.delete()
    return technician


@transaction.atomic
def sell_production_order(user, order_id, data):
    order = ProductionOrder.objects.select_for_update().get(pk=order_id)

    if order.status != ProductionOrder.STATUS_COMPLETED:
        raise ValueError('Faqat yakunlangan buyurtmani sotish mumkin')

    selling_price = _money(data.get('sellingPrice') or data.get('selling_price') or order.selling_price)
    if selling_price <= 0:
        raise ValueError('Sotuv narxi noto\'g\'ri')

    payment_type = data['payment_type']
    cash_paid = _money(data.get('cash_paid', data.get('cashPaid', 0)))
    debt_amount = _money(data.get('debt_amount', data.get('debtAmount', 0)))
    discount = _money(data.get('discount', 0))

    final_amount = _money(selling_price - discount)
    if final_amount < 0:
        raise ValueError('Chegirma narxdan oshmasligi kerak')

    final_amount, cash_paid, debt_amount = _validate_payment_split(
        payment_type, final_amount, cash_paid, debt_amount,
    )

    from .models import Customer, Debt

    customer = None
    customer_id = data.get('customerId') or data.get('customer_id')
    settings = StoreSettings.get_solo()
    debt_due_date = data.get('debt_due_date') or data.get('debtDueDate')

    if payment_type in (Sale.PAYMENT_DEBT, Sale.PAYMENT_MIXED):
        if not customer_id:
            raise ValueError('Nasiya uchun mijoz tanlanishi shart')
        if settings.mandatory_debt_due_date and not debt_due_date:
            raise ValueError('Nasiya uchun muddat kiritilishi shart')
        customer = Customer.objects.select_for_update().get(pk=customer_id)

    finished_product = _get_finished_product()
    now = timezone.now()
    receipt_no = next_receipt_no()

    sale = Sale.objects.create(
        receipt_no=receipt_no,
        date_time=now,
        seller=user,
        customer=customer,
        total_amount=selling_price,
        discount=discount,
        final_amount=final_amount,
        payment_type=payment_type,
        cash_paid=cash_paid,
        debt_amount=debt_amount,
        debt_due_date=debt_due_date,
    )

    SaleItem.objects.create(
        sale=sale,
        product=finished_product,
        product_name=f'{order.title} ({order.order_no})',
        quantity=Decimal('1'),
        price=final_amount,
        total=final_amount,
    )

    if customer and debt_amount > 0:
        Debt.objects.create(
            customer=customer,
            sale=sale,
            receipt_no=receipt_no,
            amount=debt_amount,
            remaining_amount=debt_amount,
            due_date=debt_due_date,
            created_at=now,
        )
        customer.current_debt = _money(customer.current_debt + debt_amount)
        customer.total_sales = _money(customer.total_sales + final_amount)
        customer.last_sale_date = now
        customer.save()

    order.sale = sale
    order.selling_price = selling_price
    order.status = ProductionOrder.STATUS_SOLD
    order.sold_at = now
    recalculate_order(order)
    order.profit = _money(final_amount - order.total_cost)
    order.save()

    return sale, order


def production_report(month=None):
    """Oylik ishlab chiqarish hisoboti."""
    qs = ProductionOrder.objects.select_related('technician', 'sale').filter(
        status=ProductionOrder.STATUS_SOLD,
    )

    if month:
        try:
            year, mon = month.split('-')
            qs = qs.filter(sold_at__year=int(year), sold_at__month=int(mon))
        except (ValueError, TypeError):
            pass

    sold_orders = list(qs)
    total_revenue = sum(_money(o.sale.final_amount if o.sale_id else o.selling_price) for o in sold_orders)
    total_parts = sum(_money(o.parts_cost) for o in sold_orders)
    total_labor = sum(_money(o.labor_cost) for o in sold_orders)
    total_cost = sum(_money(o.total_cost) for o in sold_orders)
    total_profit = sum(_money(o.profit) for o in sold_orders)

    tech_map = {}
    orders_data = []
    for order in sold_orders:
        qty = int(order.labor_quantity)
        if order.labor_type == Technician.LABOR_DAILY:
            labor_part = _money(order.daily_rate_snapshot * qty)
            daily_part = labor_part
            unit_part = Decimal('0')
        else:
            labor_part = _money(order.per_unit_rate_snapshot * qty)
            daily_part = Decimal('0')
            unit_part = labor_part

        orders_data.append({
            'id': str(order.id),
            'orderNo': order.order_no,
            'title': order.title,
            'technicianName': order.technician.name,
            'laborType': order.labor_type,
            'laborQuantity': qty,
            'laborCost': float(order.labor_cost),
            'totalCost': float(order.total_cost),
            'revenue': float(order.sale.final_amount if order.sale_id else order.selling_price),
            'profit': float(order.profit),
            'soldAt': order.sold_at.isoformat() if order.sold_at else None,
        })

        tid = str(order.technician_id)
        if tid not in tech_map:
            tech_map[tid] = {
                'technicianId': tid,
                'technicianName': order.technician.name,
                'ordersCount': 0,
                'totalLaborQuantity': 0,
                'dailyEarnings': Decimal('0'),
                'unitEarnings': Decimal('0'),
                'totalLabor': Decimal('0'),
            }
        entry = tech_map[tid]
        entry['ordersCount'] += 1
        entry['totalLaborQuantity'] += qty
        entry['dailyEarnings'] += daily_part
        entry['unitEarnings'] += unit_part
        entry['totalLabor'] += labor_part

    technicians = []
    for entry in tech_map.values():
        technicians.append({
            'technicianId': entry['technicianId'],
            'technicianName': entry['technicianName'],
            'ordersCount': entry['ordersCount'],
            'totalLaborQuantity': entry['totalLaborQuantity'],
            'dailyEarnings': float(entry['dailyEarnings']),
            'unitEarnings': float(entry['unitEarnings']),
            'totalLabor': float(entry['totalLabor']),
        })

    technicians.sort(key=lambda x: x['totalLabor'], reverse=True)

    return {
        'month': month,
        'summary': {
            'ordersSold': len(sold_orders),
            'totalRevenue': float(total_revenue),
            'totalPartsCost': float(total_parts),
            'totalLaborCost': float(total_labor),
            'totalCost': float(total_cost),
            'totalProfit': float(total_profit),
        },
        'technicians': technicians,
        'orders': orders_data,
    }
