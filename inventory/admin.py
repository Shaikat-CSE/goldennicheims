from django.contrib import admin
from .models import Product, StockHistory, ProductType, Supplier, Client, StockTransaction

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'type', 'quantity', 'price')
    list_filter = ('type',)
    search_fields = ('name', 'sku')

@admin.register(StockHistory)
class StockHistoryAdmin(admin.ModelAdmin):
    list_display = ('product', 'quantity', 'type', 'date', 'notes')
    list_filter = ('type', 'date')
    search_fields = ('product__name', 'notes')

@admin.register(ProductType)
class ProductTypeAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_person', 'email', 'phone')
    search_fields = ('name', 'contact_person', 'email')

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_person', 'email', 'phone')
    search_fields = ('name', 'contact_person', 'email')

@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = ('product', 'quantity', 'type', 'date', 'supplier', 'client', 'reference_number')
    list_filter = ('type', 'date')
    search_fields = ('product__name', 'supplier', 'client', 'reference_number')
    raw_id_fields = ('product', 'supplier_ref', 'client_ref')
