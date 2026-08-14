from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("card", "0003_alter_card_id_alter_topic_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="card",
            name="step",
            field=models.IntegerField(blank=True, default=None, null=True),
        ),
    ]
