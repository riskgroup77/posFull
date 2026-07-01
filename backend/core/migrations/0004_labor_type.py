# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_production_module'),
    ]

    operations = [
        migrations.AddField(
            model_name='technician',
            name='default_labor_type',
            field=models.CharField(
                choices=[('daily', 'Daily wage'), ('per_unit', 'Per unit')],
                default='daily',
                help_text='Standart ish haqi turi: kunlik yoki dona (uskuna)',
                max_length=20,
            ),
        ),
        migrations.RenameField(
            model_name='productionorder',
            old_name='work_days',
            new_name='labor_quantity',
        ),
        migrations.AddField(
            model_name='productionorder',
            name='labor_type',
            field=models.CharField(
                choices=[('daily', 'Daily wage'), ('per_unit', 'Per unit')],
                default='daily',
                help_text='Ish haqi turi: kunlik yoki dona (uskuna)',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='productionorder',
            name='labor_quantity',
            field=models.PositiveSmallIntegerField(
                default=1,
                help_text='Kunlik rejimda — ish kunlari; dona rejimda — uskuna soni',
            ),
        ),
    ]
