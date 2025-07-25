"""
ZapSign Serializers - Interface Layer
"""
from rest_framework import serializers

from .models import Company, Document, Signer


class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company model"""

    # Hide sensitive token in read operations
    api_token = serializers.CharField(write_only=True, required=False)
    documents_count = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "created_at",
            "last_updated_at",
            "api_token",
            "documents_count",
        ]
        read_only_fields = ["created_at", "last_updated_at"]

    def get_documents_count(self, obj):
        """Get total number of documents for this company"""
        return obj.documents.count()


class SignerSerializer(serializers.ModelSerializer):
    """Serializer for Signer model"""

    class Meta:
        model = Signer
        fields = ["id", "token", "status", "name", "email", "external_id", "document"]
        read_only_fields = ["token", "external_id"]

    def validate_email(self, value):
        """Validate email format"""
        if not value or "@" not in value:
            raise serializers.ValidationError("Please enter a valid email address")
        return value.lower()


class SignerCreateSerializer(serializers.Serializer):
    """Serializer for creating signers (without document reference)"""

    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower()


class DocumentListSerializer(serializers.ModelSerializer):
    """Serializer for Document list view"""

    company_name = serializers.CharField(source="company.name", read_only=True)
    signers_count = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "name",
            "status",
            "created_at",
            "last_updated_at",
            "created_by",
            "company_name",
            "signers_count",
        ]

    def get_signers_count(self, obj):
        """Get number of signers for this document"""
        return obj.signers.count()


class DocumentDetailSerializer(serializers.ModelSerializer):
    """Serializer for Document detail view"""

    company = CompanySerializer(read_only=True)
    signers = SignerSerializer(many=True, read_only=True)

    class Meta:
        model = Document
        fields = [
            "id",
            "open_id",
            "token",
            "name",
            "status",
            "created_at",
            "last_updated_at",
            "created_by",
            "company",
            "external_id",
            "signers",
        ]
        read_only_fields = [
            "open_id",
            "token",
            "external_id",
            "created_at",
            "last_updated_at",
        ]


class DocumentCreateSerializer(serializers.Serializer):
    """
    Serializer for creating documents with ZapSign integration
    Matches REAL ZapSign API format from the CURLs provided
    """

    name = serializers.CharField(max_length=255)
    pdf_url = serializers.URLField()
    company_id = serializers.IntegerField()
    created_by = serializers.CharField(max_length=255)
    signers = SignerCreateSerializer(many=True, min_length=1)

    def validate_name(self, value):
        """Validate document name"""
        if len(value.strip()) < 3:
            raise serializers.ValidationError(
                "Document name must be at least 3 characters long"
            )
        return value.strip()

    def validate_pdf_url(self, value):
        """Validate PDF URL"""
        if not value.lower().endswith(".pdf"):
            raise serializers.ValidationError("URL must point to a PDF file")
        return value

    def validate_company_id(self, value):
        """Validate company exists"""
        try:
            Company.objects.get(id=value)
        except Company.DoesNotExist:
            raise serializers.ValidationError(f"Company with ID {value} does not exist")
        return value

    def validate_signers(self, value):
        """Validate signers data"""
        if not value:
            raise serializers.ValidationError("At least one signer is required")

        # Check for duplicate emails
        emails = [signer["email"].lower() for signer in value]
        if len(emails) != len(set(emails)):
            raise serializers.ValidationError(
                "Duplicate email addresses are not allowed"
            )

        return value


class DocumentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating documents (local DB only)"""

    class Meta:
        model = Document
        fields = ["name", "status", "created_by"]

    def validate_status(self, value):
        """Validate status transitions"""
        if self.instance and self.instance.status == "COMPLETED":
            if value != "COMPLETED":
                raise serializers.ValidationError(
                    "Cannot change status of completed document"
                )
        return value


class DocumentStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating document status from ZapSign"""

    def validate(self, data):
        """This endpoint doesn't require input data"""
        return data
