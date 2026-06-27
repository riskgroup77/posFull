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
    Sale,
    StoreSettings,
)
from .permissions import IsActiveUser, IsAdmin, IsAdminOrManager, IsNotSellerOnlyWrite
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
    RepayDebtSerializer,
    ReturnSaleSerializer,
    SaleSerializer,
    StoreSettingsSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from . import services

User = get_user_model()


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower().strip()
        password = serializer.validated_data['password']

        user = User.objects.filter(email=email).first()
        if not user or user.account_status != User.STATUS_ACTIVE:
            return Response({'detail': 'Foydalanuvchi topilmadi yoki bloklangan'}, status=status.HTTP_401_UNAUTHORIZED)

        auth_user = authenticate(request, username=user.username, password=password)
        if not auth_user:
            return Response({'detail': 'Noto\'g\'ri parol'}, status=status.HTTP_401_UNAUTHORIZED)

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
            'sales': SaleSerializer(Sale.objects.select_related('seller', 'customer').prefetch_related('items').all()[:500], many=True).data,
            'debts': DebtSerializer(Debt.objects.select_related('customer', 'sale').all(), many=True).data,
            'debtPayments': DebtPaymentSerializer(DebtPayment.objects.select_related('customer').all(), many=True).data,
            'movements': InventoryMovementSerializer(InventoryMovement.objects.select_related('user', 'product').all()[:500], many=True).data,
            'settings': StoreSettingsSerializer(StoreSettings.get_solo()).data,
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
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
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
        SaleItem.objects.all().delete()
        DebtPayment.objects.all().delete()
        Debt.objects.all().delete()
        Sale.objects.all().delete()
        InventoryMovement.objects.all().delete()
        Product.objects.all().delete()
        Customer.objects.all().delete()
        Category.objects.all().delete()
        StoreSettings.objects.filter(pk=1).update(receipt_counter=100000)
        return Response({'detail': 'Ma\'lumotlar tozalandi'})
