from django.db import models

# Create your models here.

class Product(models.Model):
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=50, unique=True)
    type = models.CharField(max_length=100)
    quantity = models.IntegerField(default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    # Track product details
    location = models.CharField(max_length=100, blank=True, null=True)
    expiry_date = models.DateField(blank=True, null=True)
    batch_number = models.CharField(max_length=50, blank=True, null=True)
    barcode = models.CharField(max_length=100, blank=True, null=True)
    minimum_stock_level = models.IntegerField(default=5)
    unit_of_measure = models.CharField(max_length=50, default='Unit', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name

class Supplier(models.Model):
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['name']

class Client(models.Model):
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['name']

class StockHistory(models.Model):
    STOCK_TYPE_CHOICES = [
        ('IN', 'Stock In'),
        ('OUT', 'Stock Out'),
    ]
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_movements')
    quantity = models.IntegerField()
    type = models.CharField(max_length=3, choices=STOCK_TYPE_CHOICES)
    notes = models.TextField(blank=True, null=True)
    date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.product.name} - {self.type} - {self.quantity}"

class ProductType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    
    def __str__(self):
        return self.name

class StockTransaction(models.Model):
    TRANSACTION_TYPES = (
        ('IN', 'Stock In'),
        ('OUT', 'Stock Out'),
    )
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    type = models.CharField(max_length=3, choices=TRANSACTION_TYPES)
    notes = models.TextField(blank=True, null=True)
    supplier = models.CharField(max_length=255, blank=True, null=True)
    supplier_contact = models.CharField(max_length=255, blank=True, null=True)
    client = models.CharField(max_length=255, blank=True, null=True)
    client_contact = models.CharField(max_length=255, blank=True, null=True)
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0, blank=True)
    date = models.DateTimeField(auto_now_add=True)
    is_wastage = models.BooleanField(default=False)
    
    # Add relationships to Supplier and Client models
    supplier_ref = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    client_ref = models.ForeignKey(Client, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')

    def __str__(self):
        return f"{self.type} - {self.product.name} - {self.quantity} units"
    
    class Meta:
        ordering = ['-date']
