from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('card', '0007_scheduler_settings'),
    ]

    operations = [
        migrations.AddField(
            model_name='scheduler_settings',
            name='guest',
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='scheduler_settings',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='fsrs_settings', to='card.user'),
        ),
    ]
