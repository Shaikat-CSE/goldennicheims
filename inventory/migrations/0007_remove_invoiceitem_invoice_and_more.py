# Generated by Django 5.2.1 on 2025-06-04 09:42

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0006_product_unit_of_measure_stocktransaction_discount_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='invoiceitem',
            name='invoice',
        ),
        migrations.RemoveField(
            model_name='invoicepayment',
            name='invoice',
        ),
        migrations.RemoveField(
            model_name='invoiceitem',
            name='product',
        ),
        migrations.DeleteModel(
            name='Invoice',
        ),
        migrations.DeleteModel(
            name='InvoicePayment',
        ),
        migrations.DeleteModel(
            name='InvoiceItem',
        ),
    ]
