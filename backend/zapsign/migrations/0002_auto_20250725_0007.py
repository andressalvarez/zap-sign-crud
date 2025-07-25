# Generated by Django 5.2.4 on 2025-07-25 05:07

from django.db import migrations


def create_initial_company(apps, schema_editor):
    """Create initial company with ZapSign API token"""
    Company = apps.get_model("zapsign", "Company")
    Company.objects.get_or_create(
        name="ZapSign Demo Company",
        defaults={
            "api_token": "fa895995-6797-49fe-8561-35102d37ba9bf44a60bf-0776-4dac-aeb6-cb97f4fc7632"
        },
    )


def reverse_create_initial_company(apps, schema_editor):
    """Remove initial company"""
    Company = apps.get_model("zapsign", "Company")
    Company.objects.filter(name="ZapSign Demo Company").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("zapsign", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_initial_company, reverse_create_initial_company),
    ]
