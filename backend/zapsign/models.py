"""
ZapSign Models - Domain Layer
"""
from django.db import models
from django.utils import timezone


class Company(models.Model):
    """
    Company model representing organizations using ZapSign
    """

    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(default=timezone.now)
    last_updated_at = models.DateTimeField(auto_now=True)
    api_token = models.CharField(max_length=255)

    class Meta:
        db_table = "company"
        verbose_name_plural = "Companies"

    def __str__(self):
        return self.name


class Document(models.Model):
    """
    Document model representing documents to be signed
    """

    STATUS_CHOICES = [
        ("PENDING_API", "Pending API"),
        ("PENDING", "Pending"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    ]

    open_id = models.IntegerField(null=True, blank=True)
    token = models.CharField(max_length=255, blank=True)
    name = models.CharField(max_length=255)
    status = models.CharField(
        max_length=50, choices=STATUS_CHOICES, default="PENDING_API"
    )
    created_at = models.DateTimeField(default=timezone.now)
    last_updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255)
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="documents"
    )
    external_id = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "document"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} - {self.status}"


class Signer(models.Model):
    """
    Signer model representing people who need to sign documents
    """

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("SIGNED", "Signed"),
        ("CANCELLED", "Cancelled"),
    ]

    token = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="PENDING")
    name = models.CharField(max_length=255)
    email = models.EmailField()
    external_id = models.CharField(max_length=255, blank=True)
    document = models.ForeignKey(
        Document, on_delete=models.CASCADE, related_name="signers"
    )

    class Meta:
        db_table = "signers"
        unique_together = ["document", "email"]

    def __str__(self):
        return f"{self.name} ({self.email}) - {self.document.name}"
