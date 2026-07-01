from django.contrib.auth import authenticate, get_user_model
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Category,
    Customer,
    Debt,
    DebtPayment,
    InventoryMovement,
    Product,
    ProductionOrder,
    Sale,
    SaleItem,
    StoreSettings,
    Technician,
)
from .permissions import IsActiveUser, IsAdmin, IsAdminOrManager, IsNotSellerOnlyWrite
from .throttles import LoginRateThrottle
from .serializers import (
    BulkImportSerializer,
    CategorySerializer,
    CustomerSerializer,
    DebtPaymentSerializer,
    DebtSerializer,
    InventoryMovementCreateSerializer,
    InventoryMovementSerializer,
    LoginSerializer,
    ProductSerializer,
    ProductionAddPartSerializer,
    ProductionCompleteSerializer,
    ProductionOrderCreateSerializer,
    ProductionOrderSerializer,
    ProductionOrderUpdateSerializer,
    ProductionSellSerializer,
    RepayDebtSerializer,
    ReturnSaleSerializer,
    SaleSerializer,
    StoreSettingsSerializer,
    TechnicianSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from . import services
from . import production_services

User = get_user_model()


class HealthView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request):
        return Response({'status': 'ok'})


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower().strip()
        password = serializer.validated_data['password']

        user = User.objects.filter(email=email).first()
        auth_user = authenticate(request, username=user.username, password=password) if user else None
        if not auth_user or user.account_status != User.STATUS_ACTIVE:
            return Response({'detail': 'Email yoki parol noto\'g\'ri'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(auth_user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(auth_user).data,
        })


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class BootstrapView(APIView):
    """Barcha asosiy ma'lumotlarni bir so'rovda yuklash."""

    def get(self, request):
        user = request.user
        payload = {
            'categories': CategorySerializer(Category.objects.all(), many=True).data,
            'products': ProductSerializer(Product.objects.select_related('category').all(), many=True).data,
            'customers': CustomerSerializer(Customer.objects.all(), many=True).data,
            'sales': SaleSerializer(
                Sale.objects.select_related('seller', 'customer').prefetch_related('items').order_by('-date_time'),
                many=True,
            ).data,
            'debts': DebtSerializer(Debt.objects.select_related('customer', 'sale').all(), many=True).data,
            'debtPayments': DebtPaymentSerializer(DebtPayment.objects.select_related('customer').all(), many=True).data,
            'movements': InventoryMovementSerializer(
                InventoryMovement.objects.select_related('user', 'product').order_by('-date_time'),
                many=True,
            ).data,
            'settings': StoreSettingsSerializer(StoreSettings.get_solo()).data,
            'technicians': TechnicianSerializer(Technician.objects.all(), many=True).data,
            'productionOrders': ProductionOrderSerializer(
                ProductionOrder.objects.select_related('technician', 'created_by', 'sale')
                .prefetch_related('items')
                .order_by('-created_at'),
                many=True,
            ).data,
        }
        if user.role == User.ROLE_ADMIN:
            payload['users'] = UserSerializer(User.objects.all(), many=True).data
        else:
            payload['users'] = []
        return Response(payload)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('display_name')
    permission_classes = [IsActiveUser, IsAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsActiveUser, IsNotSellerOnlyWrite]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer
    permission_classes = [IsActiveUser, IsNotSellerOnlyWrite]

    @action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request):
        serializer = BulkImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            products = services.bulk_import_products(
                serializer.validated_data['products'],
                serializer.validated_data['duplicateAction'],
            )
        except Exception:
            return Response({'detail': 'Import jarayonida xatolik yuz berdi'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ProductSerializer(products, many=True).data, status=status.HTTP_201_CREATED)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsActiveUser]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'repay_debt'):
            return [IsActiveUser(), IsAdminOrManager()]
        return [IsActiveUser()]

    @action(detail=True, methods=['post'], url_path='repay-debt')
    def repay_debt(self, request, pk=None):
        customer = self.get_object()
        serializer = RepayDebtSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment = services.repay_customer_debt(customer.id, serializer.validated_data['amount'], request.user)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'payment': DebtPaymentSerializer(payment).data,
            'customer': CustomerSerializer(customer.__class__.objects.get(pk=customer.pk)).data,
        })


class SaleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Sale.objects.select_related('seller', 'customer').prefetch_related('items').all()
    serializer_class = SaleSerializer
    permission_classes = [IsActiveUser]

    def create(self, request):
        serializer = SaleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        v = serializer.validated_data
        try:
            sale = services.create_sale(request.user, {
                'customerId': str(v['customer'].id) if v.get('customer') else None,
                'total_amount': v['total_amount'],
                'discount': v.get('discount', 0),
                'final_amount': v['final_amount'],
                'payment_type': v['payment_type'],
                'cash_paid': v.get('cash_paid', 0),
                'debt_amount': v.get('debt_amount', 0),
                'debt_due_date': v.get('debt_due_date'),
                'date_time': v.get('date_time'),
                'items': v['items'],
            })
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Product.DoesNotExist:
            return Response({'detail': 'Mahsulot topilmadi'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)

    def post(self, request):
        return self.create(request)

    @action(detail=True, methods=['post'], url_path='return')
    def return_sale(self, request, pk=None):
        if request.user.role not in (User.ROLE_ADMIN, User.ROLE_MANAGER):
            return Response({'detail': 'Ruxsat yo\'q'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ReturnSaleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            sale = services.return_sale(pk, serializer.validated_data['reason'], request.user)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SaleSerializer(sale).data)


class SaleCreateView(APIView):
    permission_classes = [IsActiveUser]

    def post(self, request):
        serializer = SaleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        v = serializer.validated_data
        customer = v.get('customer')
        try:
            sale = services.create_sale(request.user, {
                'customerId': str(customer.id) if customer else None,
                'total_amount': v['total_amount'],
                'discount': v.get('discount', 0),
                'final_amount': v['final_amount'],
                'payment_type': v['payment_type'],
                'cash_paid': v.get('cash_paid', 0),
                'debt_amount': v.get('debt_amount', 0),
                'debt_due_date': v.get('debt_due_date'),
                'date_time': v.get('date_time'),
                'items': v['items'],
            })
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Product.DoesNotExist:
            return Response({'detail': 'Mahsulot topilmadi'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)


class SaleReturnView(APIView):
    permission_classes = [IsActiveUser, IsAdminOrManager]

    def post(self, request, sale_id):
        serializer = ReturnSaleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            sale = services.return_sale(sale_id, serializer.validated_data['reason'], request.user)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SaleSerializer(sale).data)


class DebtViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Debt.objects.select_related('customer', 'sale').all()
    serializer_class = DebtSerializer
    permission_classes = [IsActiveUser]


class DebtPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DebtPayment.objects.select_related('customer').all()
    serializer_class = DebtPaymentSerializer
    permission_classes = [IsActiveUser]


class InventoryMovementViewSet(viewsets.ModelViewSet):
    queryset = InventoryMovement.objects.select_related('user', 'product').all()
    permission_classes = [IsActiveUser, IsNotSellerOnlyWrite]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'create':
            return InventoryMovementCreateSerializer
        return InventoryMovementSerializer

    def create(self, request, *args, **kwargs):
        serializer = InventoryMovementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            movement = services.create_inventory_movement(request.user, serializer.validated_data)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(InventoryMovementSerializer(movement).data, status=status.HTTP_201_CREATED)

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        return Response(InventoryMovementSerializer(qs, many=True).data)


class SettingsView(APIView):
    permission_classes = [IsActiveUser]

    def get(self, request):
        return Response(StoreSettingsSerializer(StoreSettings.get_solo()).data)

    def put(self, request):
        if request.user.role not in (User.ROLE_ADMIN, User.ROLE_MANAGER):
            return Response({'detail': 'Ruxsat yo\'q'}, status=status.HTTP_403_FORBIDDEN)
        settings = StoreSettings.get_solo()
        serializer = StoreSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(StoreSettingsSerializer(settings).data)


class ResetDataView(APIView):
    permission_classes = [IsActiveUser, IsAdmin]

    def post(self, request):
        ProductionOrder.objects.all().delete()
        Technician.objects.all().delete()
        SaleItem.objects.all().delete()
        DebtPayment.objects.all().delete()
        Debt.objects.all().delete()
        Sale.objects.all().delete()
        InventoryMovement.objects.all().delete()
        Product.objects.all().delete()
        Customer.objects.all().delete()
        Category.objects.all().delete()
        StoreSettings.objects.filter(pk=1).update(receipt_counter=100000, production_counter=1)
        return Response({'detail': 'Ma\'lumotlar tozalandi'})


class TechnicianViewSet(viewsets.ModelViewSet):
    queryset = Technician.objects.all()
    serializer_class = TechnicianSerializer
    permission_classes = [IsActiveUser, IsAdminOrManager]


class ProductionOrderViewSet(viewsets.ModelViewSet):
    queryset = ProductionOrder.objects.select_related('technician', 'created_by', 'sale').prefetch_related('items')
    serializer_class = ProductionOrderSerializer
    permission_classes = [IsActiveUser, IsAdminOrManager]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def create(self, request, *args, **kwargs):
        serializer = ProductionOrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order = production_services.create_production_order(request.user, serializer.validated_data)
        except (Technician.DoesNotExist, ValueError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ProductionOrderSerializer(order).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        serializer = ProductionOrderUpdateSerializer(data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        try:
            order = production_services.update_production_order(kwargs['pk'], serializer.validated_data)
        except (ProductionOrder.DoesNotExist, Technician.DoesNotExist, ValueError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ProductionOrderSerializer(order).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        try:
            production_services.cancel_production_order(kwargs['pk'])
        except (ProductionOrder.DoesNotExist, ValueError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='add-part')
    def add_part(self, request, pk=None):
        serializer = ProductionAddPartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            production_services.add_part_to_order(
                request.user,
                pk,
                serializer.validated_data['productId'],
                serializer.validated_data['quantity'],
            )
            order = ProductionOrder.objects.select_related('technician', 'created_by').prefetch_related('items').get(pk=pk)
        except (ProductionOrder.DoesNotExist, Product.DoesNotExist, ValueError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ProductionOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='remove-part')
    def remove_part(self, request, pk=None):
        item_id = request.data.get('itemId') or request.data.get('item_id')
        if not item_id:
            return Response({'detail': 'itemId kerak'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            production_services.remove_part_from_order(request.user, pk, item_id)
            order = ProductionOrder.objects.select_related('technician', 'created_by').prefetch_related('items').get(pk=pk)
        except (ProductionOrder.DoesNotExist, ValueError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ProductionOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        serializer = ProductionCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order = production_services.complete_production_order(
                pk,
                selling_price=serializer.validated_data.get('sellingPrice'),
            )
        except (ProductionOrder.DoesNotExist, ValueError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ProductionOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='sell')
    def sell(self, request, pk=None):
        serializer = ProductionSellSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        if data.get('debtDueDate'):
            data['debt_due_date'] = data.pop('debtDueDate')
        if 'cashPaid' in data:
            data['cash_paid'] = data.pop('cashPaid')
        if 'debtAmount' in data:
            data['debt_amount'] = data.pop('debtAmount')
        if 'customerId' in data:
            data['customer_id'] = data.pop('customerId')
        if 'sellingPrice' in data:
            data['selling_price'] = data.pop('sellingPrice')
        try:
            sale, order = production_services.sell_production_order(request.user, pk, data)
        except (ProductionOrder.DoesNotExist, ValueError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'order': ProductionOrderSerializer(order).data,
            'sale': SaleSerializer(sale).data,
        })


class ProductionReportView(APIView):
    permission_classes = [IsActiveUser, IsAdminOrManager]

    def get(self, request):
        month = request.query_params.get('month')
        return Response(production_services.production_report(month))
