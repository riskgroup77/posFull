from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='storesettings',
            name='usd_rate',
            field=models.DecimalField(
                decimal_places=2,
                default=12800,
                help_text="1 AQSh dollari = necha so'm",
                max_digits=14,
            ),
        ),
    ]
