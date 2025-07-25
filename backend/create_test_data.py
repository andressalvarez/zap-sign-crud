#!/usr/bin/env python
import os
import sys

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
sys.path.append("/app")
django.setup()

from zapsign.models import Company, Document, Signer


def create_test_data():
    company = Company.objects.first()
    if not company:
        print("No company found. Run init_data.py first.")
        return

    print(f"Creating test documents for company: {company.name}")

    # Crear documento 1
    doc1, created = Document.objects.get_or_create(
        name="Contrato de Prueba 1",
        defaults={
            "company": company,
            "created_by": "Usuario Demo",
            "status": "PENDING",
        },
    )
    print(f'Document 1: {doc1.name} - {"Created" if created else "Already exists"}')

    # Crear firmante para doc1
    signer1, created = Signer.objects.get_or_create(
        document=doc1,
        email="juan@ejemplo.com",
        defaults={"name": "Juan Pérez", "status": "PENDING"},
    )

    # Crear documento 2
    doc2, created = Document.objects.get_or_create(
        name="Acuerdo de Confidencialidad",
        defaults={
            "company": company,
            "created_by": "Admin Sistema",
            "status": "COMPLETED",
        },
    )
    print(f'Document 2: {doc2.name} - {"Created" if created else "Already exists"}')

    # Crear firmantes para doc2
    signer2, created = Signer.objects.get_or_create(
        document=doc2,
        email="maria@ejemplo.com",
        defaults={"name": "María García", "status": "SIGNED"},
    )

    signer3, created = Signer.objects.get_or_create(
        document=doc2,
        email="carlos@ejemplo.com",
        defaults={"name": "Carlos López", "status": "SIGNED"},
    )

    print("Test data creation completed!")
    print(f"Total documents: {Document.objects.count()}")
    print(f"Total signers: {Signer.objects.count()}")


if __name__ == "__main__":
    create_test_data()
