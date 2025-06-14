# Generated by Django 5.2.1 on 2025-05-20 05:22

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='variants',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='product',
            name='name',
            field=models.CharField(max_length=255),
        ),
        migrations.AlterField(
            model_name='product',
            name='sku',
            field=models.CharField(max_length=50, unique=True),
        ),
        migrations.AlterField(
            model_name='product',
            name='type',
            field=models.CharField(max_length=100),
        ),
        migrations.CreateModel(
            name='StockTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.IntegerField()),
                ('type', models.CharField(choices=[('IN', 'Stock In'), ('OUT', 'Stock Out')], max_length=3)),
                ('notes', models.TextField(blank=True, null=True)),
                ('supplier', models.CharField(blank=True, max_length=255, null=True)),
                ('supplier_contact', models.CharField(blank=True, max_length=255, null=True)),
                ('client', models.CharField(blank=True, max_length=255, null=True)),
                ('client_contact', models.CharField(blank=True, max_length=255, null=True)),
                ('reference_number', models.CharField(blank=True, max_length=100, null=True)),
                ('unit_price', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('date', models.DateTimeField(auto_now_add=True)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='inventory.product')),
            ],
            options={
                'ordering': ['-date'],
            },
        ),
    ]
