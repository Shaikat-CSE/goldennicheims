from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Product, StockTransaction, ProductType, Supplier, Client
from .serializers import ProductSerializer, StockTransactionSerializer, ProductTypeSerializer, SupplierSerializer, ClientSerializer
from django.db.models import Count, Sum, F
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

# Create your views here.

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        threshold = int(request.query_params.get('threshold', 5))
        products = Product.objects.filter(quantity__lte=threshold)
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        total_products = Product.objects.count()
        total_value = Product.objects.aggregate(
            total=Sum(F('quantity') * F('price'))
        )['total'] or 0
        low_stock_count = Product.objects.filter(quantity__lte=5).count()
        
        return Response({
            'total_products': total_products,
            'total_value': total_value,
            'low_stock_count': low_stock_count
        })

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    
    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        supplier = self.get_object()
        transactions = supplier.transactions.all()
        serializer = StockTransactionSerializer(transactions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        supplier = self.get_object()
        # Get unique products from transactions
        product_ids = supplier.transactions.values_list('product', flat=True).distinct()
        products = Product.objects.filter(id__in=product_ids)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    
    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        client = self.get_object()
        transactions = client.transactions.all()
        serializer = StockTransactionSerializer(transactions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        client = self.get_object()
        # Get unique products from transactions
        product_ids = client.transactions.values_list('product', flat=True).distinct()
        products = Product.objects.filter(id__in=product_ids)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

class StockHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockTransaction.objects.all().order_by('-date')
    serializer_class = StockTransactionSerializer
    
    def retrieve(self, request, pk=None):
        try:
            transaction = StockTransaction.objects.get(pk=pk)
            serializer = self.get_serializer(transaction)
            
            # Add product name to response
            data = serializer.data
            data['product_name'] = transaction.product.name
            
            # Add supplier/client name if available
            if transaction.supplier_ref:
                data['supplier_name'] = transaction.supplier_ref.name
            
            if transaction.client_ref:
                data['client_name'] = transaction.client_ref.name
                
            return Response(data)
        except StockTransaction.DoesNotExist:
            return Response({'error': 'Transaction not found'}, status=404)

class ProductTypeViewSet(viewsets.ModelViewSet):
    queryset = ProductType.objects.all()
    serializer_class = ProductTypeSerializer

class StockUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            product_id = request.data.get('product')
            quantity = int(request.data.get('quantity'))
            transaction_type = request.data.get('type')
            notes = request.data.get('notes', '')
            reference_number = request.data.get('reference_number', '')
            unit_price = request.data.get('unit_price')
            discount = request.data.get('discount', 0)
            supplier = request.data.get('supplier', '')
            supplier_contact = request.data.get('supplier_contact', '')
            client = request.data.get('client', '')
            client_contact = request.data.get('client_contact', '')
            is_wastage = request.data.get('is_wastage', False)
            
            # Get supplier or client references if IDs are provided
            supplier_ref = None
            client_ref = None
            
            supplier_id = request.data.get('supplier_id')
            client_id = request.data.get('client_id')
            
            if supplier_id:
                try:
                    supplier_ref = Supplier.objects.get(id=supplier_id)
                except Supplier.DoesNotExist:
                    pass
                    
            if client_id:
                try:
                    client_ref = Client.objects.get(id=client_id)
                except Client.DoesNotExist:
                    pass
            
            # Validate inputs
            if not product_id or not quantity or not transaction_type:
                return Response({'error': 'Missing required fields'}, status=400)
                
            if transaction_type not in ['IN', 'OUT']:
                return Response({'error': 'Invalid transaction type'}, status=400)
                
            # Get product
            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                return Response({'error': 'Product not found'}, status=404)
                
            # For stock out, check if enough quantity is available
            if transaction_type == 'OUT' and product.quantity < quantity:
                return Response({'error': 'Insufficient stock'}, status=400)
                
            # Update product quantity
            if transaction_type == 'IN':
                product.quantity += quantity
            else:
                product.quantity -= quantity
                
            product.save()
            
            # Create stock transaction record
            transaction = StockTransaction.objects.create(
                product=product,
                quantity=quantity,
                type=transaction_type,
                notes=notes,
                reference_number=reference_number,
                unit_price=unit_price,
                discount=discount,
                supplier=supplier,
                supplier_contact=supplier_contact,
                client=client,
                client_contact=client_contact,
                supplier_ref=supplier_ref,
                client_ref=client_ref,
                is_wastage=is_wastage
            )
            
            # Return updated product info
            return Response({
                'success': True,
                'transaction_id': transaction.id,
                'product': {
                    'id': product.id,
                    'name': product.name,
                    'quantity': product.quantity
                }
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)
